"""
CafeOS ML Service
=================

A small FastAPI application that serves the two trained models to the CafeOS
Next.js application over HTTP/JSON.

Endpoints
---------
  GET  /health              liveness probe used by the Next.js fallback logic
  GET  /metrics             the evaluation figures reported in Chapter 4
  POST /predict/demand      Model 1 — next-day units for one or more menu items
  POST /predict/stockout    Model 2 — SAFE / WATCH / URGENT per ingredient
  POST /reorder-plan        rule layer — turns both predictions into a purchase
                            list the cafe manager can act on

Run:  uvicorn app.main:app --reload --port 8000
      (from the ml-service directory)
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MODELS = os.path.join(ROOT, "models")
REPORTS = os.path.join(ROOT, "reports")

app = FastAPI(
    title="CafeOS ML Service",
    version="1.0.0",
    description="Demand forecasting and stockout-risk prediction for CafeOS.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def _load(name: str):
    path = os.path.join(MODELS, name)
    if not os.path.exists(path):
        raise RuntimeError(
            f"Model bundle {name} not found. Run 'python train_models.py' first.")
    return joblib.load(path)


DEMAND = _load("demand_forecaster.joblib")
RISK = _load("stockout_risk.joblib")

_recipes_path = os.path.join(ROOT, "data", "recipes.csv")
RECIPES = pd.read_csv(_recipes_path) if os.path.exists(_recipes_path) else pd.DataFrame()

_ing_path = os.path.join(ROOT, "data", "ingredients.csv")
INGREDIENT_META = (pd.read_csv(_ing_path).set_index("name").to_dict("index")
                   if os.path.exists(_ing_path) else {})


def safe_encode(encoder, value: str) -> int:
    """Encode a categorical value, mapping anything unseen during training onto
    class 0 rather than raising. A cafe can add a new menu item at any time and
    the service must degrade rather than fail."""
    classes = list(encoder.classes_)
    return classes.index(value) if value in classes else 0


# ---------------------------------------------------------------------------
# Nepali festival calendar (mirrors generate_dataset.py)
# ---------------------------------------------------------------------------

FESTIVALS = [
    ("Holi", date(2026, 3, 3), date(2026, 3, 3), "spike"),
    ("Nepali New Year", date(2026, 4, 14), date(2026, 4, 14), "spike"),
    ("Buddha Jayanti", date(2026, 5, 1), date(2026, 5, 1), "holiday"),
    ("Janai Purnima", date(2026, 8, 28), date(2026, 8, 28), "holiday"),
    ("Teej", date(2026, 9, 14), date(2026, 9, 14), "spike"),
    ("Dashain", date(2026, 10, 11), date(2026, 10, 24), "exodus"),
    ("Tihar", date(2026, 11, 8), date(2026, 11, 13), "exodus"),
    ("Christmas", date(2026, 12, 25), date(2026, 12, 25), "spike"),
]


def festival_effect(d: date) -> str:
    for _, start, end, kind in FESTIVALS:
        if start <= d <= end:
            return kind
        if kind == "exodus" and timedelta(0) < (start - d) <= timedelta(days=4):
            return "pre_festival"
    return "none"


def thermal_index(d: date) -> float:
    return float(np.cos(2 * np.pi * (d.timetuple().tm_yday - 15) / 365.25))


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class DemandItem(BaseModel):
    item_name: str
    category: str = "food_main"
    price_rs: float = 100
    promo_active: int = 0
    days_since_open: int = 400
    recent_units: list[float] = Field(
        ..., description="Units sold on the last 28 days, oldest first. "
                         "At least 28 values are required for full accuracy.")


class DemandRequest(BaseModel):
    target_date: str | None = None
    items: list[DemandItem]


class IngredientSnapshot(BaseModel):
    ingredient: str
    unit: str = "kg"
    opening_stock: float
    recent_consumption: list[float] = Field(
        ..., description="Daily consumption for the last 28 days, oldest first.")
    shelf_life_days: int = 30
    supplier_lead_time_days: int = 2
    pack_price_rs: float = 100
    days_since_purchase: int = 3
    incoming_qty_7d: float = 0.0


class StockoutRequest(BaseModel):
    target_date: str | None = None
    ingredients: list[IngredientSnapshot]


class ReorderRequest(BaseModel):
    target_date: str | None = None
    horizon_days: int = 7
    items: list[DemandItem]
    ingredients: list[IngredientSnapshot]


def _resolve_date(raw: str | None) -> date:
    if not raw:
        return date.today()
    return datetime.fromisoformat(raw).date()


def _pad(series: list[float], n: int = 28) -> np.ndarray:
    """Left-pad a short history with its own mean so new items still score."""
    arr = np.asarray(series, dtype=float)
    if len(arr) == 0:
        return np.zeros(n)
    if len(arr) < n:
        arr = np.concatenate([np.full(n - len(arr), arr.mean()), arr])
    return arr[-n:]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "demand_forecaster": DEMAND["model_name"],
            "stockout_risk": RISK["model_name"],
        },
    }


@app.get("/metrics")
def metrics():
    path = os.path.join(REPORTS, "metrics.json")
    if not os.path.exists(path):
        raise HTTPException(404, "metrics.json not found — run train_models.py")
    with open(path) as f:
        return json.load(f)


@app.post("/predict/demand")
def predict_demand(req: DemandRequest):
    """MODEL 1 — forecast units sold for each requested menu item."""
    d = _resolve_date(req.target_date)
    enc = DEMAND["encoders"]
    rows = []

    for item in req.items:
        h = _pad(item.recent_units)
        roll7, roll28 = float(h[-7:].mean()), float(h.mean())
        rows.append({
            "lag_1": float(h[-1]), "lag_7": float(h[-7]), "lag_14": float(h[-14]),
            "roll_mean_7": roll7, "roll_mean_28": roll28,
            "roll_std_7": float(h[-7:].std()),
            "dow_ratio": float(h[-7] / roll7) if roll7 > 0 else 1.0,
            "price_rs": item.price_rs,
            "thermal_index": thermal_index(d),
            "day_of_week": d.weekday(), "month": d.month, "day_of_month": d.day,
            "is_saturday": int(d.weekday() == 5),
            "is_monsoon": int(d.month in (6, 7, 8)),
            "promo_active": item.promo_active,
            "days_since_open": item.days_since_open,
            "item_name_enc": safe_encode(enc["item_name"], item.item_name),
            "category_enc": safe_encode(enc["category"], item.category),
            "festival_effect_enc": safe_encode(enc["festival_effect"],
                                               festival_effect(d)),
        })

    X = pd.DataFrame(rows)[DEMAND["features"]]
    preds = DEMAND["model"].predict(X)

    return {
        "target_date": d.isoformat(),
        "model": DEMAND["model_name"],
        "festival_effect": festival_effect(d),
        "predictions": [
            {
                "item_name": item.item_name,
                "predicted_units": round(float(max(0, p))),
                "predicted_units_raw": round(float(p), 2),
                "recent_average": round(float(_pad(item.recent_units)[-7:].mean()), 2),
            }
            for item, p in zip(req.items, preds)
        ],
    }


@app.post("/predict/stockout")
def predict_stockout(req: StockoutRequest):
    """MODEL 2 — classify each ingredient's 7-day stockout risk."""
    d = _resolve_date(req.target_date)
    enc = RISK["encoders"]
    rows = []

    for ing in req.ingredients:
        h = _pad(ing.recent_consumption)
        mean7, mean28 = float(h[-7:].mean()), float(h.mean())
        std7 = float(h[-7:].std())
        coverage = ing.opening_stock / mean7 if mean7 > 0 else 99.0
        rows.append({
            "opening_stock": ing.opening_stock,
            "consumption_mean_7d": mean7,
            "consumption_std_7d": std7,
            "consumption_mean_14d": float(h[-14:].mean()),
            "consumption_mean_28d": mean28,
            "consumption_trend": mean7 / mean28 if mean28 > 0 else 1.0,
            "volatility_ratio": std7 / mean7 if mean7 > 0 else 0.0,
            "coverage_days": min(coverage, 99.0),
            "days_since_purchase": ing.days_since_purchase,
            "incoming_qty_7d": ing.incoming_qty_7d,
            "shelf_life_days": ing.shelf_life_days,
            "supplier_lead_time_days": ing.supplier_lead_time_days,
            "pack_price_rs": ing.pack_price_rs,
            "day_of_week": d.weekday(), "month": d.month,
            "is_monsoon": int(d.month in (6, 7, 8)),
            "ingredient_enc": safe_encode(enc["ingredient"], ing.ingredient),
            "unit_enc": safe_encode(enc["unit"], ing.unit),
            "festival_effect_enc": safe_encode(enc["festival_effect"],
                                               festival_effect(d)),
        })

    X = pd.DataFrame(rows)[RISK["features"]]
    model = RISK["model"]
    preds = model.predict(X)
    probs = model.predict_proba(X)
    classes = list(model.classes_)

    return {
        "target_date": d.isoformat(),
        "model": RISK["model_name"],
        "predictions": [
            {
                "ingredient": ing.ingredient,
                "risk_class": str(p),
                "confidence": round(float(pr.max()), 4),
                "probabilities": {c: round(float(v), 4)
                                  for c, v in zip(classes, pr)},
                "coverage_days": round(float(row["coverage_days"]), 2),
            }
            for ing, p, pr, row in zip(req.ingredients, preds, probs, rows)
        ],
    }


@app.post("/reorder-plan")
def reorder_plan(req: ReorderRequest):
    """RULE LAYER — combine both models into an actionable purchase list.

    1. Model 1 forecasts how many of each menu item will sell.
    2. The recipe book converts that into ingredient requirement.
    3. Model 2 flags which ingredients are genuinely at risk.
    4. Deterministic guardrails (supplier lead time, shelf life, pack size)
       decide the order quantity and when the order must be placed.

    The guardrails are intentionally NOT learned. A model may be wrong about
    quantity; it must never be able to recommend buying a week's worth of a
    three-day perishable.
    """
    d = _resolve_date(req.target_date)
    horizon = max(1, min(req.horizon_days, 14))

    demand = predict_demand(DemandRequest(target_date=d.isoformat(), items=req.items))
    risk = predict_stockout(StockoutRequest(target_date=d.isoformat(),
                                            ingredients=req.ingredients))

    # forecast -> ingredient requirement, via the recipe book
    per_item = {p["item_name"]: p["predicted_units"] for p in demand["predictions"]}
    required: dict[str, float] = {}
    if not RECIPES.empty:
        for _, r in RECIPES.iterrows():
            units = per_item.get(r["item_name"], 0)
            if units:
                required[r["ingredient"]] = (
                    required.get(r["ingredient"], 0.0)
                    + float(r["qty_per_serving"]) * units * horizon * 1.06  # waste
                )

    risk_by_ing = {p["ingredient"]: p for p in risk["predictions"]}
    lines = []

    for ing in req.ingredients:
        r = risk_by_ing.get(ing.ingredient, {})
        meta = INGREDIENT_META.get(ing.ingredient, {})
        pack_size = float(meta.get("pack_size", 1) or 1)
        order_multiple = int(meta.get("order_multiple", 1) or 1)

        # requirement over the horizon: recipe-derived if we know the recipe,
        # otherwise fall back to the ingredient's own recent consumption
        need = required.get(
            ing.ingredient,
            float(_pad(ing.recent_consumption)[-7:].mean()) * horizon)

        shortfall = need - ing.opening_stock - ing.incoming_qty_7d

        # GUARDRAIL — never order more of a perishable than it can survive
        max_useful = need * (min(ing.shelf_life_days, horizon) / horizon) \
            if ing.shelf_life_days < horizon else need * 1.5

        risk_class = r.get("risk_class", "SAFE")
        should_order = shortfall > 0 or risk_class in ("URGENT", "WATCH")

        qty = 0.0
        packs = 0
        capped_by_shelf_life = False
        if should_order:
            target = max(shortfall, 0.0)
            if risk_class == "URGENT":
                target = max(target, need * 0.5)   # top up even if arithmetic says no

            if target > 0:
                # Round UP to whole packs, then respect the supplier's minimum
                # order quantity...
                packs_needed = max(order_multiple, int(np.ceil(target / pack_size)))
                # ...but the shelf-life guardrail is applied AFTER rounding and
                # wins outright. Rounding up to a pack boundary, or a supplier
                # minimum, must never force the cafe to buy more of a perishable
                # than it can use before the stock spoils. One pack is always
                # allowed, because a part-pack cannot be purchased.
                packs_cap = max(1, int(np.floor(max_useful / pack_size)))
                packs = min(packs_needed, packs_cap)
                capped_by_shelf_life = packs < packs_needed
                qty = packs * pack_size

        # GUARDRAIL — order must be placed early enough to survive lead time
        order_by = d
        if risk_class == "URGENT":
            order_by = d
        elif risk_class == "WATCH":
            order_by = d + timedelta(days=max(0, 3 - ing.supplier_lead_time_days))
        else:
            order_by = d + timedelta(days=max(0, 7 - ing.supplier_lead_time_days))

        lines.append({
            "ingredient": ing.ingredient,
            "unit": ing.unit,
            "risk_class": risk_class,
            "confidence": r.get("confidence"),
            "coverage_days": r.get("coverage_days"),
            "current_stock": round(ing.opening_stock, 2),
            "forecast_requirement": round(need, 2),
            "shortfall": round(max(shortfall, 0.0), 2),
            "order_packs": packs,
            "order_quantity": round(qty, 2),
            "estimated_cost_rs": round(packs * float(ing.pack_price_rs), 2),
            "order_by": order_by.isoformat(),
            "capped_by_shelf_life": capped_by_shelf_life,
            "reason": _reason(risk_class, shortfall, ing)
            + (" Quantity capped to what will be used before it spoils."
               if capped_by_shelf_life else ""),
        })

    lines.sort(key=lambda l: ({"URGENT": 0, "WATCH": 1, "SAFE": 2}[l["risk_class"]],
                              -l["shortfall"]))
    to_order = [l for l in lines if l["order_packs"] > 0]

    return {
        "target_date": d.isoformat(),
        "horizon_days": horizon,
        "festival_effect": demand["festival_effect"],
        "forecast": demand["predictions"],
        "lines": lines,
        "summary": {
            "ingredients_reviewed": len(lines),
            "urgent": sum(1 for l in lines if l["risk_class"] == "URGENT"),
            "watch": sum(1 for l in lines if l["risk_class"] == "WATCH"),
            "to_order": len(to_order),
            "estimated_total_rs": round(sum(l["estimated_cost_rs"] for l in to_order), 2),
        },
    }


def _reason(risk_class: str, shortfall: float, ing: IngredientSnapshot) -> str:
    if risk_class == "URGENT":
        return (f"Predicted to run out within 3 days. Supplier needs "
                f"{ing.supplier_lead_time_days} day(s) — order today.")
    if risk_class == "WATCH":
        return "Predicted to run out within a week. Schedule the next delivery."
    if shortfall > 0:
        return "Stock covers the horizon but forecast demand exceeds it — top up."
    return "Stock is sufficient for the forecast horizon."
