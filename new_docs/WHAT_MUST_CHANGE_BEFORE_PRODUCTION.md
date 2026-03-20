# WHAT MUST CHANGE BEFORE PRODUCTION
**Audit Date:** Feb 19, 2026  
**Definition of "production":** First real paying cafe owner uses CafeOS for 7 consecutive days without switching back to their notebook.

This list is triaged by the answer to: "If this is broken when the first real cafe opens, does it immediately break trust?"

---

## TIER 0 — SHIP BLOCKERS (Fix before anyone signs up)

These are bugs that will cause immediate abandonment. They are not edge cases. They happen on every page load for every user in Nepal.

---

### T0-1: Fix Nepal Timezone (UTC+5:45) Across All Date Calculations

**Affects:** Every page that shows time-based data.

**The bug:** `new Date()` in server-side JavaScript returns UTC. Nepal is UTC+5:45. Every "today's profit," "today's orders," greeting, weekday name, and date filter is 5 hours 45 minutes wrong.

**Specific locations:**
- `src/app/cafe/dashboard/page.tsx` — `getGreeting()`, `getNepaliDay()` functions
- `src/app/cafe/expenses/page.tsx` — `todayStr = new Date().toISOString().split('T')[0]`
- `src/app/cafe/orders/page.tsx` — date range calculations
- `src/app/cafe/reports/page.tsx` — period start/end calculations
- `src/app/cafe/story/page.tsx` — passed to `get_daily_profit_detailed`
- `src/app/[cafeSlug]/page.tsx` — `isOpenNow()` function
- `src/app/explore/page.tsx` — `isOpenNow()` function

**The fix — one reusable function:**
```typescript
// src/lib/nepalTime.ts
export function getNepaliDate(): string {
  const now = new Date();
  const nepalOffset = 5 * 60 + 45; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + nepalOffset * 60000;
  const nepalDate = new Date(nepalMs);
  return nepalDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function getNepaliHour(): number {
  const now = new Date();
  const nepalOffset = 5 * 60 + 45;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + nepalOffset * 60000;
  return new Date(nepalMs).getUTCHours();
}
```

Replace all `new Date().getHours()` with `getNepaliHour()`.  
Replace all `new Date().toISOString().split('T')[0]` with `getNepaliDate()`.  
Replace `isOpenNow()` functions to use Nepal time.

**Also fix at database level:** All RPCs that accept `p_date` should interpret it as Nepal date. Document this contract.

**Impact if not fixed:** Owner opens dashboard at 9 AM. Sees "Good Night" greeting. Sees Rs 0 for today's revenue (UTC date hasn't turned over yet). Closes app. Never comes back.

---

### T0-2: Fix Recipe Cost Column Name

**The bug:** `RecipesClient.tsx` reads `ci.cost_per_unit_cents` from `cafe_ingredients`. The actual column is `purchase_price_cents`. Additionally, the per-unit cost must be `purchase_price_cents / unit_size`.

**How to verify this is broken right now:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cafe_ingredients' AND column_name = 'cost_per_unit_cents';
-- Returns 0 rows → column does not exist
```

**The fix:**
In RecipesClient.tsx, wherever `cost_per_unit_cents` is read from an ingredient, replace with:
```typescript
const costPerUnit = ingredient.purchase_price_cents / (ingredient.unit_size || 1);
```

And the total recipe cost for a line item is:
```typescript
const lineCost = costPerUnit * recipeIngredient.quantity / 100; // convert cents to Rs
```

**Impact if not fixed:** Recipe page either crashes (undefined arithmetic) or shows wildly wrong margins (-9,918% for Cappuccino). Either case destroys trust in the system. An owner who sees negative 9,000% margin on their chiya thinks the software is garbage.

---

### T0-3: Fix or Remove 6 Dead Footer Links

**The bug:** `/features`, `/pricing`, `/support`, `/support/contact`, `/legal/terms`, `/legal/privacy` — all link to 404 pages from the homepage footer.

**The fix (choose one):**
- **Option A (30 minutes):** Remove the links from the footer. Replace with "Coming Soon" text or simply remove those columns.
- **Option B (3 days):** Build minimal versions of each page. Pricing page is highest priority — a potential customer cannot evaluate the product without knowing its cost.

**Legal note:** `/legal/terms` and `/legal/privacy` are not just nice-to-have. If you collect any personal data (phone numbers, email addresses, order history), Nepal's Personal Data Privacy Act may require privacy policy disclosure. A business collecting customer data without a privacy policy is legally exposed.

**Impact if not fixed:** A cafe owner referred by a friend clicks "Pricing" before deciding to sign up. They get a 404. They assume the product is abandoned. They leave.

---

### T0-4: Remove Fabricated Homepage Claims

**The bugs (all on the homepage):**
1. "50+ Cafes Trust Us" → Replace with "Now in Beta" or remove the stat entirely
2. "10K+ Orders Processed" → Remove or replace with "Built for Nepal cafes"
3. "99.9% Uptime" → Remove (no uptime monitoring exists)
4. "Works Offline" → Change to "Cart saves on refresh" (accurate) or remove
5. All 3 testimonials → Remove or replace with honest early user quotes
6. "Nepal's #1 Cafe Management Platform" → Remove until the claim is earned

**Impact if not fixed:** Any Nepal cafe owner who has heard of NRestro (has thousands of users) will immediately know these numbers are false. The lie destroys all trust, not just the specific claims.

---

### T0-5: Fix Settings QR Page (Dead Link in Settings)

**The bug:** `/cafe/settings/qr` is listed as `status: 'available'` (active clickable link) in `settings/page.tsx`. But no `page.tsx` file exists at that path.

**Quick fix:** Change `status: 'available'` to `status: 'coming_soon'` for the QR Code Setup section in `src/app/cafe/settings/page.tsx` until the page is built.

**Impact if not fixed:** The settings page, which should be a place of control and trust, immediately breaks on the first click.

---

### T0-6: Enable RLS on `cart_items_backup_20260117`

**The bug:** This backup table has `rowsecurity = false`. Any authenticated user can query it.

**Fix:**
```sql
ALTER TABLE cart_items_backup_20260117 ENABLE ROW LEVEL SECURITY;
-- Or preferably:
DROP TABLE cart_items_backup_20260117;
```

**Impact if not fixed:** Technically exploitable by any registered user. Not a customer-facing issue today, but a real data exposure.

---

### T0-7: Fix Orders Hard Limit of 100

**The bug:** `/cafe/orders` queries `orders` with `.limit(100)` and no pagination. Any cafe doing 100+ orders per day loses access to early-morning orders.

**Fix:** Add cursor-based pagination. Show orders in batches of 25 with "Load More" button.

**Impact if not fixed:** A busy Saturday with 120 orders — the owner can't find the Rs 2,000 unpaid order from 8 AM because it falls off the 100 limit.

---

## TIER 1 — HIGH PRIORITY (Fix in first week of beta)

These won't cause immediate abandonment on day 1 but will cause churn by week 2.

### T1-1: RPC Security — Verify Caller Owns cafe_id

The RPCs `place_cafe_order`, `upsert_cafe_customer`, and similar don't verify that `auth.uid() = p_cafe_id`. Any authenticated CafeOS user could place orders or add customers to another cafe's account.

**Fix:** Add to each RPC:
```sql
IF auth.uid() != p_cafe_id THEN
  RAISE EXCEPTION 'Unauthorized: caller does not own this cafe';
END IF;
```

### T1-2: Add Customer Detail Page

**Path:** `/cafe/customers/[id]`  
**What it should show:** Customer name, phone, total visits, total spent, order history (last 20 orders), usual items, days since last visit.

The data all exists. The page doesn't. The current customer list is useless without drill-down.

### T1-3: Add Persistent Slug to Database

Replace the computed `getSlug(businessName)` with a stored slug in `vendor_profiles` or `cafe_profiles`. Enforce uniqueness at DB level. Update slug when requested, keep a redirect from the old slug.

**Why now:** Once a cafe shares their QR code, that URL is permanent. If the slug changes (because the owner renames their cafe or there's a name collision), all printed QR codes break.

### T1-4: Fix Payment Method Null Bug

8 of the first 16 real POS orders have `payment_method = null`. Identify where in CounterPOSClient.tsx the payment method is being dropped and ensure it's always passed to `place_cafe_order`.

### T1-5: Add Order Detail View

Every order in `/cafe/orders` should be tappable to show: which items, which variants, quantities, special instructions, total breakdown, payment status, and who placed it. Currently tapping an order does nothing.

### T1-6: Add Nepali Language Search Support to /explore

The `isOpenNow` fix (T0-1) covers the open/closed bug. Additionally, add transliteration support so "chiya" matches "Chiya Pasal" and "tea" matches "चिया".

### T1-7: Fix `DecisionFeedClient` or Remove It

Verify whether `get_decision_feed` exists as a DB function. If it doesn't, the component is silently failing on every dashboard load. Either implement the function or remove the component until it's ready.

### T1-8: Link Orphan Pages from Navigation

Add these to the dashboard navigation (tertiary row or a "More" section):
- `/cafe/staff` (Staff Management)
- `/cafe/tables` (Floor Plan)  
- `/cafe/performance` (Staff Performance)

### T1-9: Fix Counter POS: Always Validate Payment Method

Ensure that clicking "Pay" without selecting a payment method shows a clear error. The current flow may allow null payment_method to propagate.

### T1-10: Add Real Inventory Unit Cost Display

Ensure the Inventory page shows `purchase_price_cents / unit_size` (per-unit cost) not `purchase_price_cents` (per-pack cost). The display difference: Milk shows Rs 80/L (correct) vs Rs 80/pack (ambiguous and wrong for grams-based ingredients).

---

## TIER 2 — MEDIUM PRIORITY (Fix before public launch)

These affect day-to-day usefulness but won't cause immediate churn.

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| T2-1 | Add pagination to Orders page | 2 days | HIGH — busy cafes truncated |
| T2-2 | Kitchen tickets: verify `get_kitchen_queue` joins order_items | 1 day | HIGH — kitchen may show item-less tickets |
| T2-3 | Fix "Short Shifts" label to "Cash Short" | 15 min | LOW — confusing terminology |
| T2-4 | Fix UTC-based period calculations in Reports | 1 day | MEDIUM — wrong daily/weekly boundaries |
| T2-5 | Add shift drill-down (which orders contributed to expected cash) | 3 days | MEDIUM — investigation capability |
| T2-6 | Show variant size on kitchen tickets | 4 hours | HIGH — wrong size made |
| T2-7 | Show variant size on Order items and Story top item | 2 hours | MEDIUM — ambiguous data |
| T2-8 | Add expense history beyond today | 1 day | MEDIUM — can't review past expenses |
| T2-9 | Add search to Customer page | 4 hours | HIGH — unusable at 100+ customers |
| T2-10 | Start Rewards system (actually issue rewards when threshold reached) | 3 days | MEDIUM — currently broken |
| T2-11 | Fix "Open Now" on explore/microsite to use Nepal time (covered by T0-1) | 0 (part of T0-1) | ✅ |
| T2-12 | Unify design system: stone vs gray inconsistency | 4 hours | LOW — visual polish |
| T2-13 | Merge `/cafe/story/weekly` into `/cafe/reports` as a tab | 2 days | MEDIUM — reduces cognitive load |
| T2-14 | Add recipe unit conversion (g to kg, ml to L) | 2 days | HIGH — current recipe data may be unit-mismatched |
| T2-15 | Add "Notes to kitchen" mandatory field for allergy items | 2 days | MEDIUM — safety and quality |

---

## TIER 3 — NICE TO HAVE (Post-launch backlog)

| # | Issue |
|---|-------|
| T3-1 | Product screenshots on homepage |
| T3-2 | Demo mode (no login required) |
| T3-3 | Pricing page |
| T3-4 | Privacy policy and terms pages |
| T3-5 | Operating Hours settings page |
| T3-6 | Recurring expense support (e.g., auto-add Rs 3,000 rent on 1st of month) |
| T3-7 | Bulk menu import via CSV |
| T3-8 | Inventory auto-deduction on order completion |
| T3-9 | Staff PIN login |
| T3-10 | WhatsApp daily summary |
| T3-11 | Customer individual order history view |
| T3-12 | Print-ready menu card generation |
| T3-13 | Monthly profit story in Nepali |
| T3-14 | Receipt/ticket printing |
| T3-15 | Remove KB Stylish leftover routes from CafeOS build |

---

## MINIMUM VIABLE PRODUCTION CHECKLIST

Before the first real cafe owner signs up and pays, verify:

- [ ] T0-1: Nepal timezone in dashboard greeting, daily profit, story
- [ ] T0-2: Recipe cost calculation shows sane margins (16–80% range, not -9918%)
- [ ] T0-3: Footer dead links removed or replaced
- [ ] T0-4: Fabricated homepage claims removed
- [ ] T0-5: Settings QR link is "Coming Soon" or the page exists
- [ ] T0-6: `cart_items_backup_20260117` table dropped or RLS enabled
- [ ] T0-7: Orders page shows all orders or has pagination
- [ ] T1-4: Payment method never null in new POS orders
- [ ] T1-7: DecisionFeedClient verified or removed
- [ ] T1-3: Slug stored in DB (or slug collision documented as known risk)
- [ ] Manual test: Open a shift → take 5 orders with different payment methods → close shift → verify kitchen tickets created → verify daily story shows correct data → verify shift variance matches
