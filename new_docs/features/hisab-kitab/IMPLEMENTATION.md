# UF-2: Hisab Kitab — Daily Profit Calculator with Expense Tracking

**Status**: ✅ IMPLEMENTED  
**Date**: February 16, 2026  
**Priority**: HIGH (Core Differentiator)

---

## Overview

"Hisab Kitab" (हिसाब किताब) is CafeOS's unique daily profit calculator that tells cafe owners their REAL profit, not just revenue. This is a game-changer because no competitor in Nepal offers simple profit calculation.

### The Problem It Solves

Nepal cafe owners know roughly what they sold, but have NO IDEA what they actually profited. They buy supplies daily with cash, pay rent, pay staff — all from the same cash drawer. End of month: "paisa kata gayo?"

### Why No Competitor Has This

Every POS shows SALES reports. Nobody shows PROFIT. Because profit requires EXPENSES — and no POS tracks the small daily cash purchases at the local bazaar.

---

## Features Implemented

### 1. Quick Expense Entry (10 seconds)
- **Nepal-specific categories**: दूध, सब्जी, किराना, मासु, ग्यास, सामान, यातायात, अन्य
- Icon-based category selection for fast tapping
- Optional supplier name
- Automatic date stamping

### 2. Fixed Monthly Costs
- One-time setup for recurring costs (Rent, Salary, Electricity, Internet, Water)
- Supports monthly, yearly, and daily frequencies
- Auto-calculates daily share for profit calculation
- Quick-add templates for common costs

### 3. Daily Profit Display
```
आम्दानी (Revenue):     Rs 12,450
खर्च (Expenses):       Rs 4,200
Fixed Costs (Daily):   Rs 1,983
─────────────────────────────
नाफा (Profit):         Rs 6,267
```

### 4. Reports with P&L
- Today / 7 Days / This Month views
- Revenue breakdown
- Daily expenses breakdown
- Fixed costs (prorated by period)
- Profit margin calculation

---

## Database Schema

### Tables Created

```sql
-- Fixed monthly costs (rent, salary, electricity, etc.)
CREATE TABLE cafe_fixed_costs (
  id uuid PRIMARY KEY,
  cafe_id uuid REFERENCES vendor_profiles(user_id),
  name text NOT NULL,
  amount_cents integer NOT NULL,
  frequency text CHECK (frequency IN ('monthly', 'yearly', 'daily')),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

-- Supplier ledger for tracking supplier payments
CREATE TABLE cafe_suppliers (
  id uuid PRIMARY KEY,
  cafe_id uuid REFERENCES vendor_profiles(user_id),
  name text NOT NULL,
  phone text,
  category text,
  notes text,
  is_active boolean DEFAULT true,
  UNIQUE(cafe_id, name)
);

-- Supplier transactions (payments and dues)
CREATE TABLE cafe_supplier_transactions (
  id uuid PRIMARY KEY,
  cafe_id uuid REFERENCES vendor_profiles(user_id),
  supplier_id uuid REFERENCES cafe_suppliers(id),
  transaction_type text CHECK (transaction_type IN ('purchase', 'payment')),
  amount_cents integer NOT NULL,
  transaction_date date,
  expense_id uuid REFERENCES daily_expenses(id),
  notes text
);
```

### Functions Created

```sql
-- Calculate daily fixed cost share
get_daily_fixed_cost_share(p_cafe_id uuid) RETURNS integer

-- Get supplier balance (positive = we owe them)
get_supplier_balance(p_supplier_id uuid) RETURNS integer

-- Enhanced daily profit calculation
get_daily_profit_detailed(p_cafe_id uuid, p_date date) RETURNS jsonb
  → Returns: revenue_cents, expense_cents, fixed_cost_share_cents, profit_cents, order_count
```

---

## Files Changed/Created

### New Files
- `src/app/cafe/settings/fixed-costs/page.tsx` — Fixed costs management
- `new_docs/features/hisab-kitab/IMPLEMENTATION.md` — This documentation

### Modified Files
- `src/components/cafe/ExpensesClient.tsx` — Enhanced with Nepal categories, profit display
- `src/app/cafe/expenses/page.tsx` — Added profit data fetching
- `src/app/cafe/dashboard/page.tsx` — Uses new profit calculation function
- `src/app/cafe/reports/page.tsx` — Includes fixed costs in P&L
- `src/app/cafe/settings/page.tsx` — Added Fixed Costs settings link

---

## User Journey

### Owner Setting Up

1. Go to **Settings → Fixed Costs**
2. Add monthly costs:
   - Rent: Rs 25,000/month
   - Staff Salary: Rs 15,000/month
   - Electricity: Rs 3,000/month
3. System auto-calculates: Daily share = Rs 1,433/day

### Daily Operation

1. Counter staff or owner adds expenses throughout the day
2. Tap category icon → Enter amount → (optional) Supplier → Save
3. Dashboard shows real-time profit: Revenue - Expenses - Fixed Costs

### End of Month

1. Go to **Reports → Month**
2. See full P&L:
   - Total Revenue
   - Total Daily Expenses
   - Total Fixed Costs
   - **Net Profit**
3. Export for tax filing (future enhancement)

---

## RLS Policies

All tables have proper Row Level Security:

```sql
-- cafe_fixed_costs, cafe_suppliers, cafe_supplier_transactions
POLICY "owner_access" FOR ALL
USING (cafe_id = auth.uid() OR user_has_role(auth.uid(), 'admin'))
WITH CHECK (cafe_id = auth.uid() OR user_has_role(auth.uid(), 'admin'));
```

---

## Value Delivered

1. **First in Nepal**: No competitor calculates real profit
2. **Owner Peace of Mind**: Know your actual profit daily, not monthly
3. **Decision Support**: Identify when you're losing money BEFORE month end
4. **Tax Ready**: All expenses tracked for year-end filing
5. **Supplier Management**: Track what you owe suppliers (future: SMS reminders)

---

## Future Enhancements

- [ ] Supplier ledger with balance tracking
- [ ] SMS reminders to suppliers with dues
- [ ] Monthly P&L PDF export
- [ ] Expense categories breakdown chart
- [ ] Compare this month vs last month
- [ ] Budget alerts ("You've spent Rs 50,000 this month, 20% more than last month")

---

## Testing

1. Add fixed costs in Settings
2. Add daily expenses
3. Verify dashboard shows correct profit (Revenue - Expenses - Fixed Cost Share)
4. Check reports for different periods
5. Verify RLS: User A cannot see User B's expenses/fixed costs
