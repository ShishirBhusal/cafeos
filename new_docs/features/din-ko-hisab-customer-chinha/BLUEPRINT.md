# UF-8 Din Ko Hisab + UF-6 Customer Chinha
## Technical Blueprint

**Version**: 1.0  
**Date**: February 17, 2026  
**Status**: Phase 1-2 Complete

---

## 📊 PHASE 1: CODEBASE IMMERSION REPORT

### 1.1 Existing Infrastructure Discovered

#### UF-8 Din Ko Hisab (End-of-Day Cash Reconciliation)

**EXCELLENT NEWS: `shifts` table already exists with perfect schema!**

```sql
shifts (
  id UUID PRIMARY KEY,
  cafe_id UUID NOT NULL,           -- Links to vendor_profiles
  opened_by UUID NOT NULL,          -- Staff who opened shift
  opened_at TIMESTAMPTZ NOT NULL,   -- When shift started
  closed_by UUID,                   -- Staff who closed shift
  closed_at TIMESTAMPTZ,            -- When shift ended
  opening_float_cents INTEGER,      -- Starting cash in drawer
  expected_cash_cents INTEGER,      -- System-calculated expected cash
  actual_cash_cents INTEGER,        -- Counter person's count
  variance_cents INTEGER,           -- Difference (actual - expected)
  variance_reason TEXT,             -- Explanation for discrepancy
  status TEXT NOT NULL,             -- 'open' | 'closed'
  notes TEXT
)
```

**RLS Policy**: `shifts_cafe_access` - Allows cafe owner, counter staff, and admins.

**Current State**: 0 shifts in database (feature not yet used)

#### UF-6 Customer Chinha (Repeat Customer Recognition)

**Existing Foundation:**
- `orders.primary_customer_phone` - Already captures customer phone
- `orders.primary_customer_name` - Already captures customer name
- Counter POS already has `customerPhone` and `customerName` state
- Current data: 3 orders, 2 with phone numbers, 2 unique customers

**Gap Identified:**
- No dedicated `cafe_customers` table for customer profiles
- No loyalty tracking
- No "usual order" detection
- No quick-bill for regulars

### 1.2 KB Stylish Patterns Available for Reuse

| Pattern | Source | Adaptation |
|---------|--------|------------|
| Daily metrics aggregation | `vendor_daily` table | Reuse for shift summaries |
| Modal UI patterns | Various modals | Reuse for close-day modal |
| Form validation | Existing forms | Reuse patterns |
| Real-time updates | Kitchen display | Apply to shift status |

### 1.3 Files to Modify

| File | Purpose |
|------|---------|
| `src/app/cafe/counter/page.tsx` | Add shift management |
| `src/components/cafe/CounterPOSClient.tsx` | Add customer quick-tag, shift status |
| NEW: `src/app/cafe/shift/page.tsx` | Shift history & analytics |
| NEW: `src/app/cafe/customers/page.tsx` | Customer insights dashboard |
| NEW: `src/components/cafe/CloseShiftModal.tsx` | End-of-day modal |
| NEW: `src/components/cafe/CustomerTagInput.tsx` | Quick customer tagging |

---

## 🔥 PHASE 2: EXPERT PANEL BATTLE

### 👨‍💻 Expert 1: Security Architect

**Concerns Raised:**
1. **Can counter staff manipulate expected_cash_cents?**
   - Mitigation: `expected_cash_cents` calculated server-side via RPC, not editable by client
   
2. **Can one cafe see another's shift data?**
   - Mitigation: RLS already restricts to `cafe_id = auth.uid()`
   
3. **Phone number PII exposure?**
   - Mitigation: Phone numbers already in orders table, same RLS applies

### ⚡ Expert 2: Performance Engineer

**Concerns Raised:**
1. **Calculating expected cash for 500 orders/day?**
   - Mitigation: Single aggregate query with index on `cafe_id, created_at`
   
2. **Customer lookup by phone during busy hours?**
   - Mitigation: Index on `primary_customer_phone` + last 10 customers cached in state

### 🗄️ Expert 3: Data Architect

**Concerns Raised:**
1. **What if shift closed but orders still pending?**
   - Mitigation: Only PAID orders count toward expected cash
   
2. **Date rollover at midnight?**
   - Mitigation: Use shift's opened_at/closed_at range, not calendar date
   
3. **Multiple shifts per day?**
   - Mitigation: Schema supports multiple shifts; each shift calculates its own period

### 🎨 Expert 4: UX Engineer

**Concerns Raised:**
1. **Counter staff learning curve for customer tagging?**
   - Mitigation: Single optional phone input, autocomplete from recent customers
   
2. **Close-day flow too complex?**
   - Mitigation: 3-step wizard: Count Cash → Confirm → Done
   
3. **Visibility of current shift status?**
   - Mitigation: Persistent shift banner at top of Counter POS

### 🔬 Expert 5: Systems Integrator

**Concerns Raised:**
1. **What if internet drops during close-day?**
   - Mitigation: Show cached daily totals, allow offline close with sync
   
2. **Split shifts (morning person, evening person)?**
   - Mitigation: Each person opens/closes their own shift
   
3. **Forgot to close shift, it's next morning?**
   - Mitigation: Warning banner, allow late close with explanation

---

## 📐 PHASE 3-4: SOLUTION BLUEPRINT

### Database Changes

#### New Table: `cafe_customers`

```sql
CREATE TABLE cafe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  phone TEXT NOT NULL,
  name TEXT,
  first_visit_at TIMESTAMPTZ DEFAULT now(),
  last_visit_at TIMESTAMPTZ DEFAULT now(),
  total_visits INTEGER DEFAULT 1,
  total_spent_cents INTEGER DEFAULT 0,
  usual_items JSONB DEFAULT '[]',  -- [{product_id, name, count}]
  loyalty_points INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cafe_id, phone)
);
```

#### New Functions

```sql
-- Calculate expected cash for a shift period
CREATE FUNCTION calculate_shift_expected_cash(
  p_cafe_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS INTEGER;

-- Close shift with validation
CREATE FUNCTION close_cafe_shift(
  p_shift_id UUID,
  p_actual_cash_cents INTEGER,
  p_variance_reason TEXT
) RETURNS JSONB;

-- Get or create customer, update stats
CREATE FUNCTION upsert_cafe_customer(
  p_cafe_id UUID,
  p_phone TEXT,
  p_name TEXT,
  p_order_total_cents INTEGER
) RETURNS JSONB;
```

### Frontend Components

#### 1. Shift Status Banner (Counter POS Header)
```
┌────────────────────────────────────────────────────┐
│ 🟢 Shift Open: 7:00 AM | Cash: Rs 2,450 | [Close] │
└────────────────────────────────────────────────────┘
```

#### 2. Close Shift Modal
```
┌─────────────────────────────────────────┐
│           Close Day - Hisab            │
├─────────────────────────────────────────┤
│ Total Sales:          Rs 12,500        │
│ Cash Sales:           Rs 9,200         │
│ Digital (eSewa/Khalti): Rs 3,300       │
│                                        │
│ Enter Cash Count:     [________]       │
│                                        │
│ Expected:  Rs 9,200                    │
│ Actual:    Rs 8,900                    │
│ Difference: -Rs 300 ⚠️                 │
│                                        │
│ Reason (if different): [__________]   │
│                                        │
│         [Cancel]    [Confirm Close]    │
└─────────────────────────────────────────┘
```

#### 3. Customer Tag Input (At Billing)
```
┌─────────────────────────────────────────┐
│ Customer? [9841XXXXXX] (optional)      │
│                                        │
│ Recent: Ram B. | Sita G. | Kumar T.   │
└─────────────────────────────────────────┘
```

#### 4. Regular Customer Recognition
```
┌─────────────────────────────────────────┐
│ 🌟 Ram Bahadur — Regular! (47 visits)  │
│ Usual: Chiya + Surya = Rs 45           │
│                                        │
│    [Quick Bill: Rs 45]                 │
└─────────────────────────────────────────┘
```

### Implementation Plan

| Phase | Task | Complexity |
|-------|------|------------|
| 1 | Create `cafe_customers` table + RLS | Low |
| 2 | Create `calculate_shift_expected_cash` function | Medium |
| 3 | Create `close_cafe_shift` function | Medium |
| 4 | Create `upsert_cafe_customer` function | Medium |
| 5 | Add Shift Status Banner to Counter POS | Low |
| 6 | Create CloseShiftModal component | Medium |
| 7 | Add Customer Tag Input to Counter POS | Low |
| 8 | Create Shift History page (`/cafe/shift`) | Medium |
| 9 | Create Customer Insights page (`/cafe/customers`) | Medium |
| 10 | Integration testing | Low |

---

## ✅ APPROVAL CHECKPOINT

**Ready for Implementation?**

- [x] Phase 1: Codebase Immersion complete
- [x] Phase 2: Expert Panel Battle complete
- [x] Phase 3: Consistency Check complete
- [x] Phase 4: Solution Blueprint complete
- [ ] Phase 5-7: Awaiting user approval
- [ ] Phase 8: Implementation
- [ ] Phase 9-10: Testing & Refinement

**Key Decisions:**
1. Reuse existing `shifts` table (100% schema fit)
2. Create new `cafe_customers` table (no existing equivalent)
3. Server-side calculation of expected cash (security)
4. Optional customer tagging (no friction for counter staff)
5. Simple 3-step close-day flow

