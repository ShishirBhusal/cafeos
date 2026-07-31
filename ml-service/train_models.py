"""
CafeOS — Model Training and Evaluation
======================================

Trains and evaluates the two machine-learning modules that CafeOS uses to turn
its inventory ledger from a record-keeping system into a predictive one.

  MODEL 1  Demand Forecaster        regression      units of a menu item that
                                                    will sell tomorrow
  MODEL 2  Stockout Risk Classifier classification  SAFE / WATCH / URGENT for
                                                    each ingredient

METHODOLOGY NOTES
-----------------
* Splitting is CHRONOLOGICAL, never random. The first 70% of days train, the
  next 15% validate (model selection), the final 15% test (reported figures).
  A random split would let the model see the future and leak seasonality, which
  would inflate every number in Chapter 4.
* Candidate models are compared on the VALIDATION window only. The test window
  is scored exactly once, with the already-chosen model.
* Both models are benchmarked against the heuristic CafeOS ships today, so the
  report can state what the machine learning actually bought us.

Run:  python train_models.py
"""

from __future__ import annotations

import json
import os
import warnings

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import (GradientBoostingClassifier, RandomForestClassifier,
                              RandomForestRegressor)
from sklearn.linear_model import Ridge
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, f1_score, mean_absolute_error,
                             precision_score, r2_score, recall_score)
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
MODELS = os.path.join(HERE, "models")
REPORTS = os.path.join(HERE, "reports")
FIGURES = os.path.join(REPORTS, "figures")

for p in (MODELS, REPORTS, FIGURES):
    os.makedirs(p, exist_ok=True)

RISK_ORDER = ["SAFE", "WATCH", "URGENT"]
PALETTE = "#8C5A3C"   # CafeOS brand brown, used across every figure


def chronological_split(df: pd.DataFrame, date_col: str = "date"):
    """70 / 15 / 15 split on the time axis (never random)."""
    days = np.sort(df[date_col].unique())
    n = len(days)
    train_end, val_end = days[int(n * 0.70)], days[int(n * 0.85)]
    return (df[df[date_col] < train_end],
            df[(df[date_col] >= train_end) & (df[date_col] < val_end)],
            df[df[date_col] >= val_end])


# ===========================================================================
# MODEL 1 — DEMAND FORECASTER
# ===========================================================================

def build_demand_features(sales: pd.DataFrame) -> pd.DataFrame:
    """Lag / rolling features per menu item. Every feature is computed from days
    STRICTLY BEFORE the day being predicted, so nothing leaks."""
    sales = sales.sort_values(["item_name", "date"]).copy()
    g = sales.groupby("item_name")["units_sold"]

    sales["lag_1"] = g.shift(1)
    sales["lag_7"] = g.shift(7)
    sales["lag_14"] = g.shift(14)
    sales["roll_mean_7"] = g.shift(1).rolling(7).mean().reset_index(0, drop=True)
    sales["roll_mean_28"] = g.shift(1).rolling(28).mean().reset_index(0, drop=True)
    sales["roll_std_7"] = g.shift(1).rolling(7).std().reset_index(0, drop=True)
    # same weekday last week vs the weekly average -> weekday signature
    sales["dow_ratio"] = sales["lag_7"] / sales["roll_mean_7"].replace(0, np.nan)

    return sales.dropna().reset_index(drop=True)


DEMAND_NUMERIC = ["lag_1", "lag_7", "lag_14", "roll_mean_7", "roll_mean_28",
                  "roll_std_7", "dow_ratio", "price_rs", "thermal_index",
                  "day_of_week", "month", "day_of_month", "is_saturday",
                  "is_monsoon", "promo_active", "days_since_open"]
DEMAND_CATEGORICAL = ["item_name", "category", "festival_effect"]


def train_demand_model(report: dict) -> None:
    print("\n" + "=" * 72)
    print("MODEL 1 — DEMAND FORECASTER (regression)")
    print("=" * 72)

    sales = pd.read_csv(os.path.join(DATA, "sales_history.csv"))
    df = build_demand_features(sales)

    encoders = {c: LabelEncoder().fit(df[c]) for c in DEMAND_CATEGORICAL}
    for c, enc in encoders.items():
        df[c + "_enc"] = enc.transform(df[c])

    features = DEMAND_NUMERIC + [c + "_enc" for c in DEMAND_CATEGORICAL]
    train, val, test = chronological_split(df)
    print(f"  train {len(train):>6,} rows | val {len(val):>6,} | test {len(test):>6,}")

    Xtr, ytr = train[features], train["units_sold"]
    Xva, yva = val[features], val["units_sold"]
    Xte, yte = test[features], test["units_sold"]

    # ---- candidate comparison on the VALIDATION window --------------------
    candidates = {
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=300, max_depth=18, min_samples_leaf=2,
            random_state=42, n_jobs=-1),
        "Ridge Regression": Ridge(alpha=1.0),
    }
    selection = []
    fitted = {}
    for name, model in candidates.items():
        model.fit(Xtr, ytr)
        pred = model.predict(Xva)
        mae, r2 = mean_absolute_error(yva, pred), r2_score(yva, pred)
        selection.append({"model": name, "val_mae": round(mae, 3),
                          "val_r2": round(r2, 4)})
        fitted[name] = model
        print(f"  [val] {name:<26} MAE={mae:7.3f}  R2={r2:.4f}")

    # naive seasonal baseline: "tomorrow looks like the same weekday last week"
    base_mae = mean_absolute_error(yva, val["lag_7"])
    base_r2 = r2_score(yva, val["lag_7"])
    selection.append({"model": "Baseline: same weekday last week",
                      "val_mae": round(base_mae, 3), "val_r2": round(base_r2, 4)})
    print(f"  [val] {'Baseline (lag-7)':<26} MAE={base_mae:7.3f}  R2={base_r2:.4f}")

    best_name = min(
        (s for s in selection if s["model"] in fitted), key=lambda s: s["val_mae"]
    )["model"]
    best = fitted[best_name]
    print(f"\n  --> selected: {best_name}")

    # ---- final scoring on the untouched TEST window -----------------------
    pred = best.predict(Xte)
    mae = mean_absolute_error(yte, pred)
    rmse = float(np.sqrt(np.mean((yte - pred) ** 2)))
    r2 = r2_score(yte, pred)
    base_te_mae = mean_absolute_error(yte, test["lag_7"])
    improvement = (base_te_mae - mae) / base_te_mae * 100

    print(f"  [test] MAE  = {mae:.3f} units")
    print(f"  [test] RMSE = {rmse:.3f} units")
    print(f"  [test] R2   = {r2:.4f}")
    print(f"  [test] baseline MAE = {base_te_mae:.3f}  "
          f"-> {improvement:.1f}% better than the lag-7 heuristic")

    importance = sorted(zip(features, best.feature_importances_),
                        key=lambda t: -t[1])[:12]

    # ---- figures ----------------------------------------------------------
    plot_actual_vs_predicted(yte, pred)
    plot_residuals(yte, pred)
    plot_feature_importance(importance, "Demand Forecaster — Feature Importance",
                            "fig_demand_importance.png")
    plot_forecast_timeline(test, pred)

    # compress=3 keeps predictions bit-identical while cutting the bundle from
    # ~78 MB to a size that can live in version control
    joblib.dump({
        "model": best, "features": features, "encoders": encoders,
        "model_name": best_name,
        "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
    }, os.path.join(MODELS, "demand_forecaster.joblib"), compress=3)

    report["model_1_demand_forecaster"] = {
        "task": "regression — next-day units sold per menu item",
        "selected_model": best_name,
        "rows": {"train": len(train), "validation": len(val), "test": len(test)},
        "validation_selection": selection,
        "test_metrics": {"mae_units": round(mae, 4), "rmse_units": round(rmse, 4),
                         "r2": round(r2, 4)},
        "baseline_test_mae": round(base_te_mae, 4),
        "improvement_over_baseline_pct": round(improvement, 2),
        "top_features": [{"feature": f, "importance": round(float(i), 4)}
                         for f, i in importance],
    }


# ===========================================================================
# MODEL 2 — STOCKOUT RISK CLASSIFIER
# ===========================================================================

RISK_NUMERIC = ["opening_stock", "consumption_mean_7d", "consumption_std_7d",
                "consumption_mean_14d", "consumption_mean_28d",
                "consumption_trend", "volatility_ratio", "coverage_days",
                "days_since_purchase", "incoming_qty_7d", "shelf_life_days",
                "supplier_lead_time_days", "pack_price_rs", "day_of_week",
                "month", "is_monsoon"]
RISK_CATEGORICAL = ["ingredient", "unit", "festival_effect"]


def rule_baseline(df: pd.DataFrame) -> np.ndarray:
    """The heuristic CafeOS ships today: a flat coverage threshold, ignoring
    volatility, supplier lead time, shelf life and seasonality."""
    return np.where(df["coverage_days"] <= 3, "URGENT",
                    np.where(df["coverage_days"] <= 7, "WATCH", "SAFE"))


def train_risk_model(report: dict) -> None:
    print("\n" + "=" * 72)
    print("MODEL 2 — STOCKOUT RISK CLASSIFIER (classification)")
    print("=" * 72)

    df = pd.read_csv(os.path.join(DATA, "ingredient_history.csv"))

    encoders = {c: LabelEncoder().fit(df[c]) for c in RISK_CATEGORICAL}
    for c, enc in encoders.items():
        df[c + "_enc"] = enc.transform(df[c])

    features = RISK_NUMERIC + [c + "_enc" for c in RISK_CATEGORICAL]
    train, val, test = chronological_split(df)
    print(f"  train {len(train):>6,} rows | val {len(val):>6,} | test {len(test):>6,}")

    Xtr, ytr = train[features], train["risk_class"]
    Xva, yva = val[features], val["risk_class"]
    Xte, yte = test[features], test["risk_class"]

    candidates = {
        "Gradient Boosting Classifier": GradientBoostingClassifier(
            n_estimators=250, max_depth=5, learning_rate=0.08, random_state=42),
        "Random Forest Classifier": RandomForestClassifier(
            n_estimators=300, max_depth=16, min_samples_leaf=2,
            class_weight="balanced", random_state=42, n_jobs=-1),
        "Decision Tree Classifier": DecisionTreeClassifier(
            max_depth=10, min_samples_leaf=5, random_state=42),
    }
    selection, fitted = [], {}
    for name, model in candidates.items():
        model.fit(Xtr, ytr)
        pred = model.predict(Xva)
        acc = accuracy_score(yva, pred)
        f1 = f1_score(yva, pred, average="macro")
        selection.append({"model": name, "val_accuracy": round(acc, 4),
                          "val_macro_f1": round(f1, 4)})
        fitted[name] = model
        print(f"  [val] {name:<30} acc={acc:.4f}  macroF1={f1:.4f}")

    # reference points
    for label, pred in (("Baseline: static coverage rule", rule_baseline(val)),
                        ("Baseline: majority class",
                         DummyClassifier(strategy="most_frequent")
                         .fit(Xtr, ytr).predict(Xva))):
        acc, f1 = accuracy_score(yva, pred), f1_score(yva, pred, average="macro")
        selection.append({"model": label, "val_accuracy": round(acc, 4),
                          "val_macro_f1": round(f1, 4)})
        print(f"  [val] {label:<30} acc={acc:.4f}  macroF1={f1:.4f}")

    best_name = max((s for s in selection if s["model"] in fitted),
                    key=lambda s: s["val_macro_f1"])["model"]
    best = fitted[best_name]
    print(f"\n  --> selected: {best_name}")

    # ---- final scoring on the untouched TEST window -----------------------
    pred = best.predict(Xte)
    acc = accuracy_score(yte, pred)
    prec = precision_score(yte, pred, average="macro")
    rec = recall_score(yte, pred, average="macro")
    f1 = f1_score(yte, pred, average="macro")

    rule_pred = rule_baseline(test)
    rule_acc = accuracy_score(yte, rule_pred)
    rule_f1 = f1_score(yte, rule_pred, average="macro")

    print(f"  [test] accuracy       = {acc:.4f}")
    print(f"  [test] macro precision= {prec:.4f}")
    print(f"  [test] macro recall   = {rec:.4f}")
    print(f"  [test] macro F1       = {f1:.4f}")
    print(f"  [test] static rule    : acc={rule_acc:.4f}  macroF1={rule_f1:.4f}")

    # the operationally important number: of the ingredients that really were
    # about to run out, how many did each approach actually catch?
    urgent_recall_ml = recall_score(yte, pred, labels=["URGENT"], average="macro")
    urgent_recall_rule = recall_score(yte, rule_pred, labels=["URGENT"],
                                      average="macro")
    print(f"  [test] URGENT recall  : model={urgent_recall_ml:.4f}  "
          f"rule={urgent_recall_rule:.4f}")

    print("\n" + classification_report(yte, pred, digits=4))

    importance = sorted(zip(features, best.feature_importances_),
                        key=lambda t: -t[1])[:12]

    plot_confusion(yte, pred, "Stockout Risk — Confusion Matrix (model)",
                   "fig_risk_confusion.png")
    plot_confusion(yte, rule_pred,
                   "Stockout Risk — Confusion Matrix (static rule baseline)",
                   "fig_risk_confusion_rule.png")
    plot_feature_importance(importance, "Stockout Risk — Feature Importance",
                            "fig_risk_importance.png")

    joblib.dump({
        "model": best, "features": features, "encoders": encoders,
        "model_name": best_name, "classes": list(best.classes_),
        "metrics": {"accuracy": acc, "macro_f1": f1},
    }, os.path.join(MODELS, "stockout_risk.joblib"), compress=3)

    report["model_2_stockout_risk"] = {
        "task": "3-class classification — SAFE / WATCH / URGENT over a 7-day horizon",
        "selected_model": best_name,
        "rows": {"train": len(train), "validation": len(val), "test": len(test)},
        "class_distribution": df["risk_class"].value_counts(normalize=True)
                                .round(4).to_dict(),
        "validation_selection": selection,
        "test_metrics": {"accuracy": round(acc, 4),
                         "macro_precision": round(prec, 4),
                         "macro_recall": round(rec, 4),
                         "macro_f1": round(f1, 4)},
        "static_rule_baseline": {"accuracy": round(rule_acc, 4),
                                 "macro_f1": round(rule_f1, 4)},
        "urgent_recall": {"model": round(urgent_recall_ml, 4),
                          "static_rule": round(urgent_recall_rule, 4)},
        "per_class_report": classification_report(yte, pred, output_dict=True),
        "top_features": [{"feature": f, "importance": round(float(i), 4)}
                         for f, i in importance],
    }


# ===========================================================================
# FIGURES
# ===========================================================================

def _save(fig, filename: str) -> None:
    path = os.path.join(FIGURES, filename)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"       figure -> reports/figures/{filename}")


def plot_actual_vs_predicted(y, pred) -> None:
    fig, ax = plt.subplots(figsize=(6.5, 6))
    ax.scatter(y, pred, s=9, alpha=0.35, color=PALETTE, edgecolors="none")
    lim = [0, max(y.max(), pred.max()) * 1.03]
    ax.plot(lim, lim, "--", color="#333", linewidth=1.2, label="perfect prediction")
    ax.set_xlabel("Actual units sold")
    ax.set_ylabel("Predicted units sold")
    ax.set_title("Demand Forecaster — Actual vs Predicted (test window)")
    ax.legend()
    ax.grid(alpha=0.25)
    _save(fig, "fig_demand_actual_vs_predicted.png")


def plot_residuals(y, pred) -> None:
    resid = y - pred
    fig, ax = plt.subplots(figsize=(7.5, 5))
    ax.scatter(pred, resid, s=9, alpha=0.35, color=PALETTE, edgecolors="none")
    ax.axhline(0, color="#333", linestyle="--", linewidth=1.2)
    ax.set_xlabel("Predicted units sold")
    ax.set_ylabel("Residual (actual − predicted)")
    ax.set_title("Demand Forecaster — Residual Plot (test window)")
    ax.grid(alpha=0.25)
    _save(fig, "fig_demand_residuals.png")


def plot_forecast_timeline(test: pd.DataFrame, pred) -> None:
    """Actual vs predicted over time for the cafe's highest-volume item."""
    t = test.copy()
    t["pred"] = pred
    item = t.groupby("item_name")["units_sold"].sum().idxmax()
    sub = t[t["item_name"] == item].sort_values("date")
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.plot(pd.to_datetime(sub["date"]), sub["units_sold"], color="#333",
            linewidth=1.6, label="actual")
    ax.plot(pd.to_datetime(sub["date"]), sub["pred"], color=PALETTE,
            linewidth=1.6, linestyle="--", label="predicted")
    ax.set_title(f"Demand Forecaster — {item} (test window)")
    ax.set_ylabel("Units sold per day")
    ax.legend()
    ax.grid(alpha=0.25)
    fig.autofmt_xdate()
    _save(fig, "fig_demand_timeline.png")


def plot_confusion(y, pred, title: str, filename: str) -> None:
    cm = confusion_matrix(y, pred, labels=RISK_ORDER)
    fig, ax = plt.subplots(figsize=(6, 5.2))
    im = ax.imshow(cm, cmap="copper_r")
    ax.set_xticks(range(len(RISK_ORDER)), RISK_ORDER)
    ax.set_yticks(range(len(RISK_ORDER)), RISK_ORDER)
    ax.set_xlabel("Predicted class")
    ax.set_ylabel("Actual class")
    ax.set_title(title)
    thresh = cm.max() / 2
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, f"{cm[i, j]:,}", ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "#222", fontsize=11)
    fig.colorbar(im, ax=ax, shrink=0.8)
    _save(fig, filename)


def plot_feature_importance(importance, title: str, filename: str) -> None:
    names = [f.replace("_enc", "") for f, _ in importance][::-1]
    vals = [v for _, v in importance][::-1]
    fig, ax = plt.subplots(figsize=(7.5, 5.5))
    ax.barh(names, vals, color=PALETTE)
    ax.set_xlabel("Relative importance")
    ax.set_title(title)
    ax.grid(alpha=0.25, axis="x")
    _save(fig, filename)


# ===========================================================================

def main() -> None:
    report: dict = {
        "project": "CafeOS — Intelligent Inventory Management",
        "data_disclosure": (
            "All training and evaluation data is SYNTHETIC, produced by "
            "generate_dataset.py. The live CafeOS database holds only ~17 genuine "
            "point-of-sale orders, far below the volume supervised learning "
            "requires. These figures show that the models recover the structure "
            "present in the simulation; they are not evidence of real-world "
            "forecasting accuracy."),
        "split_strategy": "chronological 70/15/15 (train/validation/test)",
    }
    train_demand_model(report)
    train_risk_model(report)

    with open(os.path.join(REPORTS, "metrics.json"), "w") as f:
        json.dump(report, f, indent=2, default=str)
    print("\n" + "=" * 72)
    print("Saved models -> ./models/   metrics -> ./reports/metrics.json")
    print("=" * 72)


if __name__ == "__main__":
    main()
