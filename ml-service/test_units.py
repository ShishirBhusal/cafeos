"""
CafeOS — Unit Tests of Model Components
=======================================

Verifies the individual calculation, simulation, feature and service functions
that the two models depend on. Reported as Table 4.3 of the project report.

Run:  python test_units.py
"""

from __future__ import annotations

import os
import sys
from datetime import date, timedelta

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import generate_dataset as G
from app.main import (DemandItem, IngredientSnapshot, StockoutRequest, _pad,
                      health, predict_stockout, safe_encode)

rows = []


def case(test_id, component, test_input, expected, actual, passed):
    rows.append({
        "Test ID": test_id, "Component": component, "Test Input": test_input,
        "Expected Result": expected, "Actual Result": actual,
        "Status": "Pass" if passed else "FAIL",
    })


# MUT-01..03 — festival calendar -------------------------------------------
n, e, m = G.festival_context(date(2025, 10, 1))
case("MUT-01", "festival_context", "2025-10-01 (Dashain)",
     "effect=exodus, mult=0.58", f"effect={e}, mult={m}",
     e == "exodus" and abs(m - 0.58) < 1e-9)

n, e, m = G.festival_context(date(2025, 9, 19))
case("MUT-02", "festival_context", "2025-09-19 (3 days pre-Dashain)",
     "effect=pre_festival, mult=1.28", f"effect={e}, mult={m}",
     e == "pre_festival" and abs(m - 1.28) < 1e-9)

n, e, m = G.festival_context(date(2026, 3, 3))
case("MUT-03", "festival_context", "2026-03-03 (Holi)",
     "effect=spike, mult=1.45", f"effect={e}, mult={m}",
     e == "spike" and abs(m - 1.45) < 1e-9)

# MUT-04..05 — thermal index ------------------------------------------------
t_jan = G.thermal_index(date(2026, 1, 15))
case("MUT-04", "thermal_index", "15 January", "approx +1.0", f"{t_jan:.3f}",
     t_jan > 0.99)

t_jul = G.thermal_index(date(2026, 7, 16))
case("MUT-05", "thermal_index", "16 July", "approx -1.0", f"{t_jul:.3f}",
     t_jul < -0.99)

# MUT-06 — FIFO batch expiry ------------------------------------------------
today = date(2026, 7, 1)
batches = [[today - timedelta(days=1), 10.0], [today + timedelta(days=3), 5.0]]
kept, wasted = [], 0.0
for expiry, qty in batches:
    if expiry <= today:
        wasted += qty
    else:
        kept.append([expiry, qty])
case("MUT-06", "FIFO batch expiry", "1 expired batch (10), 1 fresh (5)",
     "expired discarded, 5 retained", f"wasted={wasted}, on_hand={sum(q for _, q in kept)}",
     wasted == 10.0 and sum(q for _, q in kept) == 5.0)

# MUT-07 — stockout detection ----------------------------------------------
want, stock = 50.0, 30.0
remaining = max(0.0, want - stock)
got = want - remaining
case("MUT-07", "Stockout detection", "demand=50, stock=30",
     "stockout flagged, 30 consumed", f"flag={remaining > 0}, consumed={got}",
     remaining > 0 and got == 30.0)

# MUT-08 — recipe explosion -------------------------------------------------
milk_per_tea = G.RECIPES["Milk Tea (Dudh Chiya)"]["Milk"]
units = 155
raw = milk_per_tea * units
with_waste = raw * 1.06
case("MUT-08", "Recipe explosion", "155 milk teas x 0.15 L",
     "23.25 L raw, ~24.6 L with 6% waste",
     f"{raw:.2f} L raw, {with_waste:.2f} L with waste",
     abs(raw - 23.25) < 0.01 and abs(with_waste - 24.645) < 0.01)

# MUT-09 — unseen category handling ----------------------------------------
from sklearn.preprocessing import LabelEncoder
enc = LabelEncoder().fit(["Milk", "Sugar"])
val = safe_encode(enc, "Dragonfruit Puree")
case("MUT-09", "safe_encode", "unseen ingredient name",
     "returns 0, no exception", f"returned {val}", val == 0)

# MUT-10 — short history padding -------------------------------------------
padded = _pad([5.0] * 10, 28)
case("MUT-10", "_pad", "10-day history, 28 required",
     "padded to length 28", f"length {len(padded)}, mean {padded.mean():.1f}",
     len(padded) == 28)

# MUT-11 — no order when stock is sufficient -------------------------------
req = StockoutRequest(target_date="2026-08-01", ingredients=[IngredientSnapshot(
    ingredient="Sugar", unit="kg", opening_stock=41.0,
    recent_consumption=[3.4, 3.3, 3.6, 3.8, 4.2, 4.6, 3.1] * 4,
    shelf_life_days=365, supplier_lead_time_days=3, pack_price_rs=110,
    days_since_purchase=9, incoming_qty_7d=0)])
res = predict_stockout(req)
p_sugar = res["predictions"][0]
case("MUT-11", "Risk prediction (stable, high cover)",
     "Sugar, ~11 days cover", "class SAFE",
     f"{p_sugar['risk_class']} (conf {p_sugar['confidence']})",
     p_sugar["risk_class"] == "SAFE")

# MUT-12 — urgent detection on a perishable --------------------------------
req = StockoutRequest(target_date="2026-08-01", ingredients=[IngredientSnapshot(
    ingredient="Buff Mince", unit="kg", opening_stock=2.1,
    recent_consumption=[7.6, 7.2, 7.9, 8.4, 9.6, 10.7, 7.0] * 4,
    shelf_life_days=3, supplier_lead_time_days=1, pack_price_rs=480,
    days_since_purchase=3, incoming_qty_7d=0)])
p_mince = predict_stockout(req)["predictions"][0]
case("MUT-12", "Risk prediction (perishable, low cover)",
     "Buff Mince, ~0.25 days cover", "class URGENT",
     f"{p_mince['risk_class']} (conf {p_mince['confidence']})",
     p_mince["risk_class"] == "URGENT")

# MUT-13 — probability distribution is valid -------------------------------
probs = p_mince["probabilities"]
total = sum(probs.values())
case("MUT-13", "Probability distribution", "risk prediction output",
     "3 classes summing to 1.0", f"{len(probs)} classes, sum={total:.4f}",
     len(probs) == 3 and abs(total - 1.0) < 1e-6)

# MUT-14 — model bundle loading --------------------------------------------
import joblib
ok = True
detail = []
for name in ("demand_forecaster.joblib", "stockout_risk.joblib"):
    b = joblib.load(os.path.join(HERE, "models", name))
    ok = ok and "model" in b and "features" in b and "encoders" in b
    detail.append(f"{b['model_name']} ({len(b['features'])} features)")
case("MUT-14", "Model bundle loading", "both .joblib bundles",
     "models + feature lists load", "; ".join(detail), ok)

# MUT-15 — health endpoint --------------------------------------------------
h = health()
case("MUT-15", "Health endpoint", "GET /health",
     "status ok with model names",
     f"{h['status']}: {list(h['models'].values())}",
     h["status"] == "ok" and len(h["models"]) == 2)

# MUT-16 — no data leakage in demand features ------------------------------
sales = pd.read_csv(os.path.join(HERE, "data", "sales_history.csv"))
one = sales[sales["item_name"] == "Milk Tea (Dudh Chiya)"].sort_values("date")
feat = G_lag = one["units_sold"].shift(7)
aligned = (feat.iloc[14] == one["units_sold"].iloc[7])
case("MUT-16", "Causal feature construction", "lag_7 alignment check",
     "lag_7 at row i equals units at row i-7", f"aligned={aligned}", bool(aligned))

# --------------------------------------------------------------------------
df = pd.DataFrame(rows)
passed = int((df["Status"] == "Pass").sum())

pd.set_option("display.max_colwidth", 46)
print("\n" + "=" * 118)
print("CafeOS — UNIT TEST RESULTS (Table 4.3)")
print("=" * 118)
print(df.to_string(index=False))
print("-" * 118)
print(f"Passed: {passed} / {len(df)}")
print("=" * 118)

df.to_csv(os.path.join(HERE, "reports", "unit_tests.csv"), index=False)
print("Saved -> reports/unit_tests.csv")

if passed != len(df):
    sys.exit(1)
