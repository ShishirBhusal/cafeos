# DATA INTEGRITY REPORT
**Audit Date:** Feb 19, 2026  
**Database:** Supabase project `ouwivkmekcycteuydbyg`  
**Test Cafe:** The Tea House — `8e80ead5-ce95-4bad-ab30-d4f54555584b`

---

## 1. TABLE ROW COUNTS & STATUS

| Table | Rows | Status |
|-------|------|--------|
| order_items | 2,711 | ✅ Expected (avg 1.75 items/order) |
| orders | 1,548 | ⚠️ 1,531 are seeded test data, ~17 real POS orders |
| carts | 362 | ⚠️ KB Stylish leftover data — not CafeOS |
| daily_expenses | 88 | ✅ Test data, 30 days |
| kitchen_tickets | 14 | 🔴 CRITICAL: 14 tickets for 1,548 orders |
| cafe_customers | 15 | ⚠️ 10 of 15 have 0 visits, 0 actual orders |
| cafe_ingredients | 27 | ✅ Reasonable inventory list |
| cafe_recipes | 12 | ⚠️ Only 12 recipes for unknown number of menu items |
| cafe_recipe_ingredients | 43 | ⚠️ Recipe cost calculation is BROKEN (see §5) |
| shifts | 32 | ✅ 30 days of test data, all closed |
| cafe_profiles | 5 | ⚠️ Only 5 cafes exist (homepage claims 50+) |
| vendor_profiles | 5 | ✅ Matches cafe_profiles |
| customer_rewards | 0 | 🔴 Feature exists in UI, zero rewards ever issued |
| anonymous_customer_patterns | 0 | 🔴 Feature dead — zero rows ever |
| cafe_reviews | 0 | 🔴 Reviews feature dead — zero rows |
| cafe_tables | 1 | ⚠️ One table in system |
| cart_items_backup_20260117 | 8 | 🔴 **RLS DISABLED** — data exposure risk |
| bookings / booking_reservations | 0 | ℹ️ KB Stylish, not CafeOS |
| reviews / review_votes | 0 | ℹ️ KB Stylish, not CafeOS |

---

## 2. KITCHEN TICKETS GAP — CRITICAL FINDING

```sql
-- Result:
2026-02-18: 8 orders → 8 tickets  (today, real POS orders)
2026-02-17: 69 orders → 3 tickets (66 missing)
2026-02-16: 58 orders → 3 tickets (55 missing)
2026-02-15: 67 orders → 0 tickets (67 missing)
2026-02-14 and earlier: 0 tickets
```

**Root cause:** ~1,530 orders were seeded directly into the `orders` table, bypassing `place_cafe_order()`. The POS function *does* create tickets — Feb 18 proves it. But the seeded data means the kitchen display has almost always appeared empty throughout development. This is a **test data corruption problem**, not a production bug. However:

- The development team has been looking at a kitchen display with 14 tickets vs 1,548 orders for weeks
- No one verified the kitchen display actually works under realistic load
- The realtime subscription and polling have never been stress-tested

---

## 3. REVENUE CONSISTENCY CHECK

```sql
-- Raw SQL today (Feb 19, 2026): Rs 0 (no orders today yet)
-- Total all-time paid: Rs 270,710
-- Total orders: 1,539
-- Paid orders: 1,536
-- Unpaid orders: 3
```

**Finding:** Revenue math is consistent between raw SQL and function calls. The 3 unpaid orders represent Rs ~300 based on test data distribution. No discrepancy detected.

---

## 4. CUSTOMER VISIT COUNT ACCURACY

```sql
-- Accurate customers:
Ram Bahadur: stored=216, actual=216 ✅
Sunita Tamang: stored=126, actual=126 ✅
Bikash Maharjan: stored=100, actual=100 ✅

-- Ghost customers (0 visits, 0 actual orders):
Anita Rai: stored=0, actual=0 — last_visit set to Jan 21
Deepak Thapa: stored=0, actual=0 — last_visit set to Jan 24
[10 more similar ghosts]
```

**Finding:** The 5 active customers have accurate counts (the upsert_cafe_customer function works correctly). The 10 ghost customers were seeded with `last_visit_at` timestamps but no corresponding orders — they are phantom test data with misleading timestamps.

---

## 5. RECIPE COST CALCULATION — CRITICAL BUG

**The ingredient schema stores PACK price, not per-unit price:**
```
Milk (DDC): unit=L, unit_size=1.00, purchase_price_cents=8000 (Rs 80 per liter)
Tea Leaves (Ilam): unit=g, unit_size=500.00, purchase_price_cents=24000 (Rs 240 per 500g)
```

**The bug:** The recipe UI (RecipesClient.tsx) uses `cost_per_unit_cents` as a column name, but the actual column is `purchase_price_cents`. Additionally, to get cost per unit, you must divide `purchase_price_cents / unit_size`.

**Raw margin query (using purchase_price_cents directly — WRONG):**
```
Cappuccino Rs 120: food cost Rs 12,021 → margin -9,918% ❌
Masala Tea Rs 40: food cost Rs 1,448 → margin -3,522% ❌
```

**Corrected margin query (dividing by unit_size — CORRECT):**
```
Buff Momo Rs 120: food cost Rs 99.80 → margin 16.8% ✅
Cappuccino Rs 120: food cost Rs 79.20 → margin 34.0% ✅
Masala Tea Rs 40: food cost Rs 15.52 → margin 61.2% ✅
Kalo Chiya Rs 20: food cost Rs 1.72 → margin 91.4% ✅
```

**What the owner sees in the UI:** Either catastrophically wrong margins (if cost_per_unit_cents reads as null and renders 0, showing 100% margin — falsely reassuring) OR a JavaScript crash (if it reads the wrong column and does arithmetic on null).

---

## 6. FIXED COSTS

```
Active fixed costs:
- Internet: Rs 1,500/month
- Monthly Rent: Rs 15,000/month
- Other Monthly: Rs 2,000/month
- Staff Salary (total): Rs 18,000/month
Total: Rs 36,500/month
Daily share: Rs 1,303 (÷28 for February)
```

**Finding:** No duplicates. 4 active entries. Daily fixed cost calculation appears reasonable for a small Nepal cafe. The previous session's duplicate bug was fixed.

---

## 7. SHIFT DATA INTEGRITY

```sql
-- Result:
status: closed
count: 32
avg_variance_rs: -39.43
zero_variance_count: 1
closed_before_opened: 0
earliest: 2026-01-19
latest: 2026-02-18
```

**Finding:** All 32 shifts closed. Average variance is Rs -39.43 (consistent, not alarming). 1 perfect match shift. No corrupted timestamps. The variance data is seeded and looks slightly artificial (too round) but no integrity violations.

---

## 8. ORDER SOURCE DISTRIBUTION

```sql
source=pos, method=cash: 1,531 orders
source=pos, method=null: 8 orders (the real POS orders from Feb 18 — payment_method wasn't passed correctly for some)
```

**Finding:** Zero QR menu orders. Zero delivery orders. 100% POS. The QR ordering flow from the public microsite either has never been tested or doesn't work end-to-end. The 8 orders with null payment_method suggest the counter POS is passing `payment_method = null` for orders taken on the counter — this is a data quality issue.

---

## 9. INGREDIENTS BELOW MINIMUM STOCK

```sql
-- No ingredients below min_stock_level
-- All ingredients have current_stock >= min_stock_level
```

**Finding:** No stock alerts needed. But this is test data — all stock levels were set at or above minimum during seeding. The `get_stock_alerts` RPC exists and would work with real depleted stock.

---

## 10. RLS AUDIT

- **95 tables with RLS enabled** ✅
- **1 table with RLS DISABLED:** `cart_items_backup_20260117` 🔴
  - This table contains 8 rows of backup cart data
  - Any authenticated user could potentially read this via direct API calls
  - Should be dropped or have RLS enabled immediately

- **No cross-cafe data leak found** in tested scenarios via standard RLS policy structure

---

## 11. MISSING DATABASE FUNCTIONS

Functions that pages call but do NOT exist:
- `get_decision_feed()` — used by `DecisionFeedClient` — **UNVERIFIED** (component references it but function not found in pg_proc check)

Functions that exist:
- `get_daily_story` ✅
- `get_daily_profit` ✅
- `get_daily_profit_detailed` ✅
- `get_weekly_review` ✅
- `get_kitchen_queue` ✅
- `get_current_shift` ✅
- `place_cafe_order` ✅
- `get_stock_alerts` ✅
- `get_cafe_tables_with_orders` ✅
- `upsert_cafe_customer` ✅
- `mark_order_paid` ✅

---

## 12. TIMEZONE MISMATCH — SYSTEMIC BUG

Nepal Standard Time (NST) = UTC+5:45.

**Every date/time calculation using `new Date()` in server-side JavaScript returns UTC.**

Affected queries and functions:
- `get_daily_profit_detailed` is called with `p_date: todayStr` where `todayStr = new Date().toISOString().split('T')[0]` — **UTC date, not NST**
- `orders` page date filter: uses UTC midnight, not NST midnight
- `reports` page period calculation: UTC-based, not NST
- `getGreeting()` on dashboard: UTC hours → shows "Good Night" at 6 PM Nepal time
- `getNepaliDay()`: UTC day → could show wrong weekday from 12:00 AM–5:45 AM Nepal time

**Impact:** Any cafe open after midnight Nepal time (or doing reports in the morning) will see incorrect day boundaries, wrong profit numbers, wrong greeting.

---

## SUMMARY

| Category | Status |
|----------|--------|
| Revenue math | ✅ Consistent |
| Kitchen ticket creation | ✅ Works via POS, broken for seeded data |
| Customer visit counts | ✅ Accurate for real customers |
| Recipe cost display | 🔴 BROKEN — wrong column name + unit mismatch |
| Fixed costs | ✅ Clean |
| Shift data | ✅ Consistent |
| RLS | ⚠️ 1 table unprotected (backup table) |
| Timezone | 🔴 Systemic UTC bug across all date calculations |
| Test data contamination | ⚠️ 1,530 seeded orders make system look broken |
