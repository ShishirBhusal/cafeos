# CafeOS TRUST AUDIT — Phase 0 Atomic Verification
**Date**: 2026-02-18
**Cafe**: The Tea House (8e80ead5-ce95-4bad-ab30-d4f54555584b)
**Data**: 1534 orders, 88 expenses, 32 shifts (1 open), 15 customers, 9 kitchen tickets, 0 recipes, 0 waste logs

---

## Feature: Dashboard Revenue
**URL**: /cafe/dashboard
**What it claims to do**: Show today's revenue
**SQL verification**: `SELECT SUM(total_cents) FROM orders WHERE cafe_id=... AND DATE(created_at)='2026-02-18' AND status NOT IN ('canceled','refunded')` → 18000 (Rs 180)
**Paid-only**: `SELECT SUM(total_cents) WHERE payment_status='paid'` → 10000 (Rs 100)
**UI shows**: Rs 180 (via get_daily_profit_detailed which counts ALL orders)
**Match?**: ❌ Mismatch — Dashboard inflates revenue by including unpaid orders
**Root cause**: `get_daily_profit_detailed` has NO `payment_status = 'paid'` filter
**Fix required**: Add `AND payment_status = 'paid'` to revenue query in function

---

## Feature: Reports Revenue
**URL**: /cafe/reports
**What it claims to do**: Show revenue for period (today/week/month)
**SQL verification**: Reports page filters `payment_status === 'paid'` client-side → Rs 100
**UI shows**: Rs 100
**Match?**: ✅ Correct
**Note**: Reports page is the CORRECT implementation. Dashboard is wrong.

---

## Feature: Dashboard Profit
**URL**: /cafe/dashboard
**What it claims to do**: Show today's net profit
**SQL verification**: `get_daily_profit_detailed` returns profit_cents = -271000 (Rs -2,710)
**Breakdown**: revenue 18000 - expenses 0 - fixed_costs 289000 = -271000
**UI shows**: Rs -2,710
**Match?**: ⚠️ Math is correct given inputs, BUT inputs are wrong:
  - Revenue includes unpaid (should be 10000 not 18000)
  - Fixed cost Rs 2,890/day is inflated by duplicate entries AND hardcoded /30
**Root cause**: Revenue bug + fixed cost bugs compound
**Fix required**: Fix revenue filter + fix fixed cost duplicates + fix division

---

## Feature: Fixed Costs
**URL**: /cafe/settings/fixed-costs
**What it claims to do**: Track monthly fixed costs and show daily share
**SQL verification**: 10 active costs totaling Rs 86,700/month
**Problem**: DUPLICATE entries from template + user-added:
  - Rent Rs 12,000 + Monthly Rent Rs 15,000
  - Staff Salary (2) Rs 30,000 + Staff Salary (total) Rs 18,000
  - Electricity Rs 2,500 + Electricity Rs 3,000
  - Internet/WiFi Rs 1,200 + Internet Rs 1,500
**UI shows**: Daily share Rs 2,890 (÷30)
**Match?**: ❌ Mismatch — duplicates inflate, /30 is wrong for February (28 days)
**Root cause**: setup_cafe_from_template created costs, user added more. Division hardcoded to 30.
**Fix required**: 
  1. Deactivate template duplicates (keep user-entered ones)
  2. Change /30 → /days_in_current_month in DB function, reports page, settings page

---

## Feature: Aaja Ko Katha (Daily Story)
**URL**: /cafe/story
**What it claims to do**: Daily narrative with revenue, comparisons, insights
**SQL verification**: `get_daily_story` counts ALL orders (no payment_status filter)
**UI shows**: Total revenue including unpaid
**Match?**: ❌ Same revenue bug as dashboard
**Root cause**: `get_daily_story` missing `AND payment_status = 'paid'` on revenue query
**Fix required**: Add payment_status filter to get_daily_story

---

## Feature: Shift History
**URL**: /cafe/shift
**What it claims to do**: Show last 30 days of shifts with variance trend
**SQL verification**: 31 closed shifts exist within 30 days
**Variance data**: Ranges from -8000 to -12 cents. 30 seed shifts have expected_cash = 200000 (artificial).
**Variance chart**: Code renders bar chart at lines 134-153. With 31 data points, `sparklineData.length > 1` = true.
**UI shows**: Chart SHOULD render with 31 bars
**Match?**: ⚠️ Chart code is correct. If empty in UI, likely a server-render issue or data not reaching client.
**Note**: Seed data shifts have artificial expected_cash=200000 with tiny variances (-0.12 to -4.82). One REAL shift has -8000 variance.

---

## Feature: Close Shift (Paisa Darpan)
**URL**: Modal in Counter POS
**What it claims to do**: Show cash flow waterfall and variance trend on close
**SQL verification**: `get_shift_cash_flow` correctly filters `payment_status = 'paid'` ✅
**SQL verification**: `get_variance_trend` correctly queries closed shifts ✅
**UI shows**: Waterfall bars + sparkline after close
**Match?**: ✅ Correct — these functions properly filter paid orders

---

## Feature: Kitchen Display
**URL**: /cafe/kitchen
**What it claims to do**: Show active kitchen orders with token numbers
**SQL verification**: 9 kitchen tickets exist
**Missing**: No `source` column on orders — can't show QR vs POS badge
**Match?**: ⚠️ Works but missing source attribution

---

## Feature: Counter POS
**URL**: /cafe/counter
**What it claims to do**: Place orders
**SQL verification**: 3 real orders today, all with payment_method NULL
**Missing**: No staff attribution (no `taken_by_staff_id` column)
**Missing**: No order source tracking
**Match?**: ⚠️ Core ordering works, staff/source tracking missing

---

## Feature: Inventory
**URL**: /cafe/inventory
**What it claims to do**: Track ingredients and stock levels
**SQL verification**: `ingredients` table DOES NOT EXIST
**SQL verification**: `get_stock_alerts` function DOES NOT EXIST
**UI shows**: Will error/crash — queries non-existent table
**Match?**: ❌ BROKEN — page will fail on load
**Root cause**: Inventory page references `ingredients` table that was never created. The existing `inventory` table is the KB Stylish e-commerce inventory (variant_id, location_id).
**Fix required**: Create `cafe_ingredients` table or rename/migrate inventory schema

---

## Feature: Inventory Costs
**URL**: /cafe/inventory/costs
**What it claims to do**: Show food cost analysis
**Depends on**: Recipes + ingredients — both empty/missing
**Match?**: ⚠️ Page exists but shows all zeros — disconnected from reality

---

## Feature: Recipes
**URL**: /cafe/inventory/recipes
**What it claims to do**: Link menu items to ingredients
**SQL verification**: No route exists → 404 black page
**Table**: `recipes` exists (cafe_id, product_id, ingredient_variant_id) but 0 rows and uses e-commerce variant IDs
**Match?**: ❌ BROKEN — 404 page, wrong schema
**Fix required**: Create route + create proper cafe_recipes schema

---

## Feature: Customers (Customer Chinha)
**URL**: /cafe/customers
**What it claims to do**: Track customer visits, spend, usual items
**SQL verification**: 15 cafe_customers exist
**Schema**: Has phone, name, first_visit_at, last_visit_at, total_visits, total_spent_cents, usual_items, loyalty_points
**Missing**: No avg_order_value, visit_frequency, risk_status, preferred_time columns
**Match?**: ⚠️ Basic tracking works, intelligence features missing

---

## Feature: Promotions
**URL**: /cafe/promotions
**What it claims to do**: Manage cafe promotions
**SQL verification**: Only `stylist_promotions` table exists — no cafe promotions table
**Match?**: ⚠️ May work for stylist context but not cafe-specific

---

## Feature: Order Source (QR vs POS)
**SQL verification**: `source` column DOES NOT EXIST on orders table
**Match?**: ❌ Missing — no way to distinguish order origin
**Fix required**: Add `source` column to orders

---

## Feature: formatRs Currency Utility
**Audit**: 35 files with different implementations
**Variants found**:
  - `en-NP` locale (non-standard, may not work correctly)
  - `en-IN` locale (correct for Nepal number formatting)
  - Some handle negatives, some don't
  - Some use `maximumFractionDigits`, some don't
**Match?**: ❌ Inconsistent — needs ONE shared utility
**Fix required**: Create `src/lib/formatRs.ts` used everywhere

---

# SUMMARY

| Category | Count |
|----------|-------|
| ✅ Correct | 3 |
| ⚠️ Partially correct | 7 |
| ❌ Broken/Wrong | 6 |

## P0 FIXES (Trust Destroyers):
1. Revenue: Add `payment_status = 'paid'` to `get_daily_profit_detailed` and `get_daily_story`
2. Fixed costs: Remove duplicates, change /30 to /days_in_month
3. Inventory page: Create `cafe_ingredients` table
4. Recipes 404: Build the page

## P1 FIXES (Missing Trust Signals):
5. Add `source` column to orders (pos/qr_menu/waiter_app)
6. Add `taken_by_staff_id` to orders
7. Create shared formatRs utility
8. Customer intelligence columns (risk_status, frequency, etc.)
