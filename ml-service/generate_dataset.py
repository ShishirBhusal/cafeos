"""
CafeOS — Synthetic Operating-History Generator
==============================================

Builds an 18-month operating history for a Kathmandu cafe running CafeOS, so the
two machine-learning modules can be trained and evaluated on data with realistic
structure.

DISCLOSURE
----------
Every record produced here is SYNTHETIC. The live CafeOS database contains only
~17 genuine point-of-sale orders (see new_docs/DATA_INTEGRITY_REPORT.md), which
is far below the volume any supervised model needs. This generator therefore
simulates the demand process rather than sampling real transactions. Results
computed on this data measure whether the models can recover known structure --
they are NOT evidence of real-world forecasting accuracy.

The simulation encodes six effects observed in Kathmandu food-service operations:

  1. Weekday rhythm      Saturday is Nepal's weekly holiday -> peak footfall.
                         Friday evening elevated. Sunday is a normal work day.
  2. Festival calendar   Dashain and Tihar EMPTY the valley (residents travel to
                         ancestral homes) but the shopping window before them
                         spikes. Holi / Nepali New Year / Valentine's spike.
  3. Monsoon suppression June-August rain reduces walk-in footfall.
  4. Thermal elasticity  Hot beverages rise in winter, cold ones in summer.
                         Food items are largely temperature-neutral.
  5. Growth trend        Slow organic growth in the customer base over 18 months.
  6. Promotions          Happy-hour / discount windows lift affected items.

Outputs (written to ./data/):
  menu_items.csv          the simulated menu
  ingredients.csv         the simulated store cupboard
  recipes.csv             ingredient requirement per menu item
  sales_history.csv       one row per (date, menu item)  -> Model 1 training set
  ingredient_history.csv  one row per (date, ingredient) -> Model 2 training set

Run:  python generate_dataset.py
"""

from __future__ import annotations

import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

RNG = np.random.default_rng(20260731)  # fixed seed -> reproducible report figures

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

HISTORY_START = date(2025, 2, 1)
HISTORY_END = date(2026, 7, 31)


# ---------------------------------------------------------------------------
# 1. The menu
# ---------------------------------------------------------------------------
# thermal: +1 = sells more when cold (hot drinks), -1 = sells more when hot,
#           0 = temperature neutral (food).
# base   : mean units/day at opening, before any multiplier.

MENU = [
    # name,                  category,    base, price_rs, thermal
    ("Milk Tea (Dudh Chiya)", "beverage_hot",  95, 40,  1.0),
    ("Masala Chiya",          "beverage_hot",  62, 50,  1.0),
    ("Black Tea (Kalo Chiya)","beverage_hot",  28, 30,  1.0),
    ("Americano",             "beverage_hot",  34, 150, 0.7),
    ("Cappuccino",            "beverage_hot",  41, 190, 0.7),
    ("Cafe Latte",            "beverage_hot",  37, 200, 0.7),
    ("Hot Chocolate",         "beverage_hot",  18, 180, 1.0),
    ("Cold Coffee",           "beverage_cold", 30, 220, -1.0),
    ("Iced Americano",        "beverage_cold", 22, 180, -1.0),
    ("Lassi",                 "beverage_cold", 25, 120, -0.9),
    ("Fresh Lime Soda",       "beverage_cold", 27, 100, -1.0),
    ("Veg Momo",              "food_main",     58, 160, 0.2),
    ("Buff Momo",             "food_main",     64, 180, 0.2),
    ("Chicken Chowmein",      "food_main",     44, 190, 0.1),
    ("Veg Thukpa",            "food_main",     21, 170, 0.6),
    ("Club Sandwich",         "food_main",     26, 250, 0.0),
    ("Chicken Burger",        "food_main",     23, 280, 0.0),
    ("French Fries",          "food_snack",    39, 130, 0.0),
    ("Samosa",                "food_snack",    33, 40,  0.1),
    ("Chocolate Cake Slice",  "food_bakery",   17, 160, 0.0),
    ("Croissant",             "food_bakery",   12, 140, 0.0),
]


# ---------------------------------------------------------------------------
# 2. The store cupboard
# ---------------------------------------------------------------------------
# name, unit, pack/purchase size, price per pack (Rs), shelf_life_days,
# supplier lead time (days), reorder pack multiple
INGREDIENTS = [
    ("Milk",              "L",   1,    95,   4,  1, 20),
    ("Tea Leaves",        "kg",  1,    650,  365, 3, 2),
    ("Sugar",             "kg",  1,    110,  365, 3, 10),
    ("Coffee Beans",      "kg",  1,    1800, 120, 5, 2),
    ("Masala Mix",        "kg",  1,    900,  180, 4, 1),
    ("Cocoa Powder",      "kg",  1,    1200, 240, 5, 1),
    ("Ginger",            "kg",  1,    180,  14, 1, 2),
    ("Cardamom",          "kg",  1,    3200, 240, 6, 1),
    ("Ice",               "kg",  5,    60,   2,  1, 4),
    ("Lime",              "kg",  1,    140,  10, 1, 3),
    ("Soda Water",        "L",   1,    70,   180, 3, 12),
    ("Yoghurt",           "kg",  1,    160,  6,  1, 5),
    ("Momo Wrapper",      "pcs", 100,  180,  5,  2, 6),
    ("Buff Mince",        "kg",  1,    480,  3,  1, 6),
    ("Chicken Breast",    "kg",  1,    420,  3,  1, 6),
    ("Cabbage",           "kg",  1,    60,   8,  1, 5),
    ("Onion",             "kg",  1,    90,   21, 2, 8),
    ("Noodles",           "kg",  1,    150,  120, 3, 5),
    ("Potato",            "kg",  1,    70,   30, 2, 12),
    ("Bread Loaf",        "pcs", 1,    75,   3,  1, 8),
    ("Burger Bun",        "pcs", 1,    30,   4,  1, 10),
    ("Cheese Slice",      "pcs", 1,    22,   30, 3, 20),
    ("Cooking Oil",       "L",   1,    210,  180, 3, 5),
    ("Wheat Flour",       "kg",  1,    85,   90, 3, 8),
    ("Butter",            "kg",  1,    780,  60, 3, 2),
    ("Eggs",              "pcs", 1,    18,   21, 2, 30),
    ("Chocolate Cake",    "pcs", 1,    900,  4,  2, 2),
    ("Croissant (frozen)","pcs", 1,    55,   45, 4, 12),
]


# ---------------------------------------------------------------------------
# 3. Recipes  (menu item -> {ingredient: quantity per serving})
# ---------------------------------------------------------------------------
RECIPES = {
    "Milk Tea (Dudh Chiya)":  {"Milk": 0.15, "Tea Leaves": 0.005, "Sugar": 0.012},
    "Masala Chiya":           {"Milk": 0.15, "Tea Leaves": 0.005, "Sugar": 0.012,
                               "Masala Mix": 0.002, "Ginger": 0.003, "Cardamom": 0.0005},
    "Black Tea (Kalo Chiya)": {"Tea Leaves": 0.004, "Sugar": 0.010},
    "Americano":              {"Coffee Beans": 0.018},
    "Cappuccino":             {"Coffee Beans": 0.018, "Milk": 0.12},
    "Cafe Latte":             {"Coffee Beans": 0.018, "Milk": 0.18},
    "Hot Chocolate":          {"Milk": 0.20, "Cocoa Powder": 0.020, "Sugar": 0.015},
    "Cold Coffee":            {"Coffee Beans": 0.016, "Milk": 0.15, "Ice": 0.10,
                               "Sugar": 0.015},
    "Iced Americano":         {"Coffee Beans": 0.018, "Ice": 0.12},
    "Lassi":                  {"Yoghurt": 0.20, "Sugar": 0.018, "Ice": 0.05},
    "Fresh Lime Soda":        {"Lime": 0.04, "Soda Water": 0.25, "Sugar": 0.012,
                               "Ice": 0.08},
    "Veg Momo":               {"Momo Wrapper": 10, "Cabbage": 0.09, "Onion": 0.04,
                               "Cooking Oil": 0.008},
    "Buff Momo":              {"Momo Wrapper": 10, "Buff Mince": 0.10, "Onion": 0.04,
                               "Cooking Oil": 0.008},
    "Chicken Chowmein":       {"Noodles": 0.12, "Chicken Breast": 0.07, "Cabbage": 0.05,
                               "Onion": 0.03, "Cooking Oil": 0.015},
    "Veg Thukpa":             {"Noodles": 0.10, "Cabbage": 0.06, "Onion": 0.03,
                               "Cooking Oil": 0.010},
    "Club Sandwich":          {"Bread Loaf": 0.25, "Chicken Breast": 0.06,
                               "Cheese Slice": 1, "Eggs": 1, "Butter": 0.010},
    "Chicken Burger":         {"Burger Bun": 1, "Chicken Breast": 0.09,
                               "Cheese Slice": 1, "Onion": 0.02, "Cooking Oil": 0.012},
    "French Fries":           {"Potato": 0.18, "Cooking Oil": 0.030},
    "Samosa":                 {"Wheat Flour": 0.04, "Potato": 0.06, "Cooking Oil": 0.020},
    "Chocolate Cake Slice":   {"Chocolate Cake": 0.125},
    "Croissant":              {"Croissant (frozen)": 1, "Butter": 0.005},
}


# ---------------------------------------------------------------------------
# 4. Nepali festival calendar (Gregorian equivalents for the simulated window)
# ---------------------------------------------------------------------------
# Effect model:
#   "spike"    -> celebratory footfall, cafes busy
#   "exodus"   -> valley empties, cafes quiet; preceded by a shopping-rush window
#   "holiday"  -> public holiday, mild lift

FESTIVALS = [
    ("Maha Shivaratri", date(2025, 2, 26), date(2025, 2, 26), "holiday"),
    ("Holi",            date(2025, 3, 14), date(2025, 3, 14), "spike"),
    ("Nepali New Year", date(2025, 4, 14), date(2025, 4, 14), "spike"),
    ("Buddha Jayanti",  date(2025, 5, 12), date(2025, 5, 12), "holiday"),
    ("Janai Purnima",   date(2025, 8,  9), date(2025, 8,  9), "holiday"),
    ("Teej",            date(2025, 8, 26), date(2025, 8, 26), "spike"),
    ("Indra Jatra",     date(2025, 9,  6), date(2025, 9,  6), "spike"),
    ("Dashain",         date(2025, 9, 22), date(2025, 10, 6), "exodus"),
    ("Tihar",           date(2025, 10, 18), date(2025, 10, 23), "exodus"),
    ("Chhath",          date(2025, 10, 27), date(2025, 10, 27), "holiday"),
    ("Christmas",       date(2025, 12, 25), date(2025, 12, 25), "spike"),
    ("Valentine's Day", date(2026, 2, 14), date(2026, 2, 14), "spike"),
    ("Maha Shivaratri", date(2026, 2, 15), date(2026, 2, 15), "holiday"),
    ("Losar",           date(2026, 2, 18), date(2026, 2, 18), "holiday"),
    ("Holi",            date(2026, 3,  3), date(2026, 3,  3), "spike"),
    ("Nepali New Year", date(2026, 4, 14), date(2026, 4, 14), "spike"),
    ("Buddha Jayanti",  date(2026, 5,  1), date(2026, 5,  1), "holiday"),
]


def festival_context(d: date):
    """Return (festival_name, festival_effect, multiplier) for a given day."""
    for name, start, end, kind in FESTIVALS:
        if start <= d <= end:
            if kind == "spike":
                return name, "spike", 1.45
            if kind == "exodus":
                return name, "exodus", 0.58
            return name, "holiday", 1.12
        # shopping rush in the 4 days before an exodus festival
        if kind == "exodus" and timedelta(0) < (start - d) <= timedelta(days=4):
            return name, "pre_festival", 1.28
    return "none", "none", 1.0


DOW_FACTOR = {
    0: 0.92,   # Monday
    1: 0.95,   # Tuesday
    2: 0.97,   # Wednesday
    3: 1.00,   # Thursday
    4: 1.14,   # Friday  (eve of the weekly holiday)
    5: 1.32,   # Saturday (Nepal's weekly holiday -- peak)
    6: 0.90,   # Sunday  (working day in Nepal)
}


def monsoon_factor(d: date) -> float:
    """June-August rain suppresses walk-in footfall."""
    return {6: 0.88, 7: 0.82, 8: 0.86}.get(d.month, 1.0)


def thermal_index(d: date) -> float:
    """+1 in deep winter, -1 in peak summer. Drives hot/cold beverage split."""
    doy = d.timetuple().tm_yday
    # Kathmandu: coldest ~mid-January (doy 15), hottest ~mid-June (doy 166)
    return float(np.cos(2 * np.pi * (doy - 15) / 365.25))


# ---------------------------------------------------------------------------
# 5. Simulate daily sales
# ---------------------------------------------------------------------------

def build_sales_history() -> pd.DataFrame:
    days = []
    d = HISTORY_START
    while d <= HISTORY_END:
        days.append(d)
        d += timedelta(days=1)

    total_days = len(days)
    rows = []

    # promotions: a handful of multi-week campaigns on random item subsets
    promo_windows = []
    for _ in range(9):
        start_idx = int(RNG.integers(0, total_days - 20))
        length = int(RNG.integers(7, 21))
        n_items = int(RNG.integers(2, 5))
        items = list(RNG.choice([m[0] for m in MENU], size=n_items, replace=False))
        promo_windows.append((start_idx, start_idx + length, set(items)))

    for i, d in enumerate(days):
        fest_name, fest_effect, fest_mult = festival_context(d)
        dow_mult = DOW_FACTOR[d.weekday()]
        mon_mult = monsoon_factor(d)
        therm = thermal_index(d)
        # organic growth: +38% customer base over the full window
        trend = 1.0 + 0.38 * (i / total_days)
        # a shared day-level shock (weather, road closure, local event)
        day_shock = float(RNG.normal(1.0, 0.085))
        day_shock = max(0.55, day_shock)

        active_promos = {itm for s, e, items in promo_windows if s <= i < e for itm in items}

        for name, category, base, price, thermal in MENU:
            promo = name in active_promos
            thermal_mult = 1.0 + 0.42 * thermal * thermal_index_weight(thermal)
            mult = (dow_mult * mon_mult * fest_mult * trend * day_shock
                    * thermal_mult * (1.22 if promo else 1.0))
            lam = max(0.4, base * mult)
            units = int(RNG.poisson(lam))
            rows.append({
                "date": d.isoformat(),
                "item_name": name,
                "category": category,
                "price_rs": price,
                "units_sold": units,
                "day_of_week": d.weekday(),
                "month": d.month,
                "day_of_month": d.day,
                "is_saturday": int(d.weekday() == 5),
                "festival_name": fest_name,
                "festival_effect": fest_effect,
                "is_monsoon": int(d.month in (6, 7, 8)),
                "thermal_index": round(therm, 4),
                "promo_active": int(promo),
                "days_since_open": i,
            })
    return pd.DataFrame(rows)


def thermal_index_weight(item_thermal: float) -> float:
    """How strongly this item responds to the season (signed by item thermal)."""
    return item_thermal


# ---------------------------------------------------------------------------
# 6. Simulate the store cupboard day by day
# ---------------------------------------------------------------------------

def build_ingredient_history(sales: pd.DataFrame) -> pd.DataFrame:
    """Replay sales through the recipe book, run a realistic ordering policy, and
    record a daily snapshot per ingredient together with what ACTUALLY happened
    over the following seven days (the supervised label).

    Three sources of real-world friction are modelled, because without them the
    simulated cafe never runs out of anything and the classification target
    collapses to a single class:

      * FIFO batch expiry -- perishables (milk, mince, bread) are held as dated
        batches and discarded when they pass their shelf life.
      * Unreliable suppliers -- a share of deliveries arrive late.
      * Imperfect review cadence -- the manager checks stock every third day
        against a flat rule-of-thumb reorder point, not continuously.
    """

    ing_meta = {
        n: dict(unit=u, pack_size=ps, pack_price=pp, shelf_life=sl,
                lead_time=lt, order_multiple=om)
        for n, u, ps, pp, sl, lt, om in INGREDIENTS
    }

    # daily consumption per ingredient
    sales["date"] = pd.to_datetime(sales["date"])
    consumption = {}
    for d, grp in sales.groupby("date"):
        per_day = {n: 0.0 for n in ing_meta}
        for _, r in grp.iterrows():
            recipe = RECIPES.get(r["item_name"], {})
            for ing, qty in recipe.items():
                # 4-9% kitchen waste, varies day to day
                waste = 1.0 + float(RNG.uniform(0.04, 0.09))
                per_day[ing] += qty * r["units_sold"] * waste
        consumption[d.date()] = per_day

    dates = sorted(consumption.keys())

    # Stock is held as FIFO batches: {ingredient: [[expiry_date, qty], ...]}
    batches: dict[str, list[list]] = {}
    for n, m in ing_meta.items():
        typical = np.mean([consumption[d][n] for d in dates[:30]])
        qty = float(typical * RNG.uniform(3, 6))
        batches[n] = [[dates[0] + timedelta(days=m["shelf_life"]), qty]]

    def on_hand(ing: str) -> float:
        return float(sum(q for _, q in batches[ing]))

    # pending deliveries: {arrival_date: {ingredient: qty}}
    pending: dict[date, dict[str, float]] = {}
    last_purchase: dict[str, date] = {n: dates[0] for n in ing_meta}

    snapshots = []
    consumed_log = {n: [] for n in ing_meta}   # parallel history for lag features
    waste_log = {n: 0.0 for n in ing_meta}

    for idx, d in enumerate(dates):
        # 1. discard anything that expired overnight (perishable spoilage)
        for ing in ing_meta:
            keep = []
            for expiry, qty in batches[ing]:
                if expiry <= d:
                    waste_log[ing] += qty
                else:
                    keep.append([expiry, qty])
            batches[ing] = keep

        # 2. receive deliveries scheduled for today
        for ing, qty in pending.pop(d, {}).items():
            batches[ing].append([d + timedelta(days=ing_meta[ing]["shelf_life"]), qty])
            last_purchase[ing] = d

        # 3. snapshot BEFORE today's service -- this is what the model would see
        snap_stock = {ing: on_hand(ing) for ing in ing_meta}

        # 4. serve the day, drawing FIFO (oldest batch first). A shortfall means
        #    the cafe ran out mid-service and had to 86 the affected items.
        stockout_today = {}
        for ing in ing_meta:
            want = consumption[d][ing]
            remaining = want
            batches[ing].sort(key=lambda b: b[0])
            for b in batches[ing]:
                if remaining <= 0:
                    break
                take = min(b[1], remaining)
                b[1] -= take
                remaining -= take
            batches[ing] = [b for b in batches[ing] if b[1] > 1e-9]
            got = want - remaining
            stockout_today[ing] = int(remaining > 1e-9)
            consumed_log[ing].append(got)

        # 5. ordering policy: the manager reviews stock every third day against a
        #    flat 4-day rule of thumb -- the same static-threshold heuristic the
        #    current CafeOS build ships. Suppliers are unreliable: roughly one
        #    delivery in eight arrives one to three days late.
        if idx % 3 == 0:
            for ing, m in ing_meta.items():
                recent = consumed_log[ing][-7:]
                avg = float(np.mean(recent)) if recent else 0.0
                if avg <= 0:
                    continue
                coverage = on_hand(ing) / avg
                if coverage < 4.0:
                    # order enough for ~10 days, rounded up to pack multiples
                    need = avg * 10 - on_hand(ing)
                    packs = max(m["order_multiple"],
                                int(np.ceil(need / m["pack_size"])))
                    delay = int(RNG.integers(1, 4)) if RNG.random() < 0.12 else 0
                    arrival = d + timedelta(days=m["lead_time"] + delay)
                    pending.setdefault(arrival, {})
                    pending[arrival][ing] = (
                        pending[arrival].get(ing, 0.0) + packs * m["pack_size"]
                    )

        # 5. record the snapshot with lag features
        for ing, m in ing_meta.items():
            hist = consumed_log[ing]
            if idx < 30:
                continue  # warm-up: not enough history for lag features
            c7 = hist[-7:]
            c14 = hist[-14:]
            c28 = hist[-28:]
            mean7 = float(np.mean(c7))
            std7 = float(np.std(c7))
            mean28 = float(np.mean(c28))
            coverage_days = snap_stock[ing] / mean7 if mean7 > 0 else 99.0

            fest_name, fest_effect, _ = festival_context(d)
            snapshots.append({
                "date": d.isoformat(),
                "ingredient": ing,
                "unit": m["unit"],
                "shelf_life_days": m["shelf_life"],
                "supplier_lead_time_days": m["lead_time"],
                "pack_price_rs": m["pack_price"],
                "opening_stock": round(snap_stock[ing], 4),
                "consumption_mean_7d": round(mean7, 4),
                "consumption_std_7d": round(std7, 4),
                "consumption_mean_14d": round(float(np.mean(c14)), 4),
                "consumption_mean_28d": round(mean28, 4),
                "consumption_trend": round(mean7 / mean28 if mean28 > 0 else 1.0, 4),
                "volatility_ratio": round(std7 / mean7 if mean7 > 0 else 0.0, 4),
                "coverage_days": round(min(coverage_days, 99.0), 4),
                "days_since_purchase": (d - last_purchase[ing]).days,
                "incoming_qty_7d": round(sum(
                    q.get(ing, 0.0) for a, q in pending.items()
                    if d < a <= d + timedelta(days=7)), 4),
                "day_of_week": d.weekday(),
                "month": d.month,
                "festival_effect": fest_effect,
                "is_monsoon": int(d.month in (6, 7, 8)),
                "stockout_today": stockout_today[ing],
                "_idx": idx,
            })

    snap = pd.DataFrame(snapshots)

    # 7. LABEL: days until the next actual stockout, looking forward from each
    #    snapshot. Derived from observed outcomes, NOT from a threshold rule.
    label_rows = []
    for ing, grp in snap.groupby("ingredient"):
        grp = grp.sort_values("_idx").reset_index(drop=True)
        out_idx = grp.index[grp["stockout_today"] == 1].to_numpy()
        for i in range(len(grp)):
            future = out_idx[out_idx > i]
            gap = int(future[0] - i) if len(future) else 999
            if gap <= 3:
                risk = "URGENT"
            elif gap <= 7:
                risk = "WATCH"
            else:
                risk = "SAFE"
            row = grp.iloc[i].to_dict()
            row["days_to_stockout"] = min(gap, 999)
            row["risk_class"] = risk
            label_rows.append(row)

    out = pd.DataFrame(label_rows).drop(columns=["_idx"])
    return out.sort_values(["date", "ingredient"]).reset_index(drop=True)


# ---------------------------------------------------------------------------
# 7. Entrypoint
# ---------------------------------------------------------------------------

def main() -> None:
    os.makedirs(DATA, exist_ok=True)

    print("Simulating 18 months of cafe operation...")
    sales = build_sales_history()
    sales.to_csv(os.path.join(DATA, "sales_history.csv"), index=False)
    print(f"  sales_history.csv        {len(sales):>7,} rows "
          f"({sales['date'].nunique()} days x {sales['item_name'].nunique()} items)")

    ing_hist = build_ingredient_history(sales.copy())
    ing_hist.to_csv(os.path.join(DATA, "ingredient_history.csv"), index=False)
    print(f"  ingredient_history.csv   {len(ing_hist):>7,} rows "
          f"({ing_hist['ingredient'].nunique()} ingredients)")

    pd.DataFrame(MENU, columns=["name", "category", "base_units", "price_rs",
                                "thermal_response"]).to_csv(
        os.path.join(DATA, "menu_items.csv"), index=False)
    pd.DataFrame(INGREDIENTS, columns=["name", "unit", "pack_size", "pack_price_rs",
                                       "shelf_life_days", "lead_time_days",
                                       "order_multiple"]).to_csv(
        os.path.join(DATA, "ingredients.csv"), index=False)
    pd.DataFrame(
        [{"item_name": k, "ingredient": ing, "qty_per_serving": q}
         for k, v in RECIPES.items() for ing, q in v.items()]
    ).to_csv(os.path.join(DATA, "recipes.csv"), index=False)

    print("\nRisk class distribution:")
    print(ing_hist["risk_class"].value_counts(normalize=True).round(4).to_string())
    print("\nDaily units sold — summary:")
    print(sales.groupby("item_name")["units_sold"].mean().round(1).sort_values(
        ascending=False).head(8).to_string())
    print("\nDone. Data written to ./data/")


if __name__ == "__main__":
    main()
