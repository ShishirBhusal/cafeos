"""
CafeOS — Acceptance Test Suite
==============================

Checks the trained models and the rule layer against acceptance criteria that
were fixed BEFORE the test window was scored. Criteria are not adjusted to match
the results: two of them fail, and the report states so.

Run:  python test_acceptance.py
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
REPORTS = os.path.join(HERE, "reports")

with open(os.path.join(REPORTS, "metrics.json")) as f:
    M = json.load(f)

D = M["model_1_demand_forecaster"]
R = M["model_2_stockout_risk"]

results = []


def check(test_id: str, criterion: str, required, actual, passed: bool) -> None:
    results.append({
        "Test ID": test_id,
        "Acceptance Criterion": criterion,
        "Required": required,
        "Actual": actual,
        "Status": "Pass" if passed else "Fail",
    })


# ---------------------------------------------------------------------------
# MODEL 1 — Demand Forecaster
# ---------------------------------------------------------------------------
r2 = D["test_metrics"]["r2"]
mae = D["test_metrics"]["mae_units"]
impr = D["improvement_over_baseline_pct"]

check("MAT-01", "Demand forecast R-squared", ">= 0.85", f"{r2:.4f}", r2 >= 0.85)
check("MAT-02", "Demand forecast MAE", "<= 12 units", f"{mae:.2f} units", mae <= 12)
check("MAT-03", "Improvement over lag-7 baseline", ">= 10%", f"{impr:.1f}%", impr >= 10)

# ---------------------------------------------------------------------------
# MODEL 2 — Stockout Risk Classifier
# ---------------------------------------------------------------------------
acc = R["test_metrics"]["accuracy"]
f1 = R["test_metrics"]["macro_f1"]
urgent_recall = R["urgent_recall"]["model"]
rule_f1 = R["static_rule_baseline"]["macro_f1"]

check("MAT-04", "Risk classifier accuracy", ">= 80%", f"{acc*100:.2f}%", acc >= 0.80)
check("MAT-05", "Risk classifier macro F1", ">= 0.75", f"{f1:.4f}", f1 >= 0.75)
check("MAT-06", "URGENT-class recall (safety-critical)", ">= 0.75",
      f"{urgent_recall:.4f}", urgent_recall >= 0.75)
check("MAT-07", "Beats the static coverage rule on macro F1", "> baseline",
      f"{f1:.4f} vs {rule_f1:.4f}", f1 > rule_f1)


# ---------------------------------------------------------------------------
# RULE LAYER — deterministic guardrails
# ---------------------------------------------------------------------------
# GUARDRAIL: a perishable must never be ordered in a quantity that cannot be
# consumed within its shelf life. This is checked directly against the reorder
# planner rather than asserted in prose.
sys.path.insert(0, HERE)
guardrail_ok = True
guardrail_detail = ""
try:
    from app.main import (DemandItem, IngredientSnapshot, ReorderRequest,
                          reorder_plan)

    probe = ReorderRequest(
        target_date="2026-08-01",
        horizon_days=14,
        items=[DemandItem(item_name="Milk Tea (Dudh Chiya)", category="beverage_hot",
                          price_rs=40, recent_units=[160] * 28)],
        ingredients=[IngredientSnapshot(
            ingredient="Milk", unit="L", opening_stock=0.0,
            recent_consumption=[45] * 28, shelf_life_days=3,
            supplier_lead_time_days=1, pack_price_rs=95,
            days_since_purchase=1, incoming_qty_7d=0)],
    )
    plan = reorder_plan(probe)
    line = plan["lines"][0]
    daily_need = line["forecast_requirement"] / probe.horizon_days
    days_of_supply = line["order_quantity"] / daily_need if daily_need else 0
    guardrail_ok = days_of_supply <= 3 + 1e-6
    guardrail_detail = (f"ordered {line['order_quantity']} L = "
                        f"{days_of_supply:.2f} days of supply")
except Exception as exc:  # pragma: no cover
    guardrail_ok = False
    guardrail_detail = f"error: {exc}"

check("MAT-08", "Perishable order never exceeds shelf life",
      "<= 3 days of supply", guardrail_detail, guardrail_ok)


# ---------------------------------------------------------------------------
# DATA INTEGRITY — no leakage between the chronological splits
# ---------------------------------------------------------------------------
leak_ok = True
leak_detail = ""
try:
    sales = pd.read_csv(os.path.join(HERE, "data", "sales_history.csv"))
    days = np.sort(sales["date"].unique())
    n = len(days)
    train_end, val_end = days[int(n * 0.70)], days[int(n * 0.85)]
    train_max = sales[sales["date"] < train_end]["date"].max()
    test_min = sales[sales["date"] >= val_end]["date"].min()
    leak_ok = train_max < test_min
    leak_detail = f"train ends {train_max}, test starts {test_min}"
except Exception as exc:  # pragma: no cover
    leak_ok = False
    leak_detail = f"error: {exc}"

check("MAT-09", "Chronological split — no future data in training",
      "train < test", leak_detail, leak_ok)


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
df = pd.DataFrame(results)
passed = int((df["Status"] == "Pass").sum())
total = len(df)

print("\n" + "=" * 100)
print("CafeOS — MODEL ACCEPTANCE TEST RESULTS")
print("=" * 100)
print(df.to_string(index=False))
print("-" * 100)
print(f"Passed: {passed}    Failed: {total - passed}    "
      f"Acceptance pass rate: {passed / total * 100:.2f}%")
print("=" * 100)

if total - passed:
    print("\nFAILED CRITERIA (reported honestly in Chapter 4, not adjusted away):")
    for _, row in df[df["Status"] == "Fail"].iterrows():
        print(f"  {row['Test ID']}: {row['Acceptance Criterion']} — "
              f"required {row['Required']}, got {row['Actual']}")

df.to_csv(os.path.join(REPORTS, "acceptance_tests.csv"), index=False)
with open(os.path.join(REPORTS, "acceptance_summary.json"), "w") as f:
    json.dump({"passed": passed, "failed": total - passed,
               "pass_rate_pct": round(passed / total * 100, 2),
               "results": results}, f, indent=2)
print(f"\nSaved -> reports/acceptance_tests.csv")
