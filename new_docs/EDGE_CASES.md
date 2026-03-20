# CafeOS Edge Cases Documentation

**Created**: February 18, 2026  
**Purpose**: Document edge cases for production readiness

---

## ORDER LIFECYCLE EDGE CASES

### 1. Order placed but internet cuts during kitchen ticket creation
**Current Behavior**: Order saved to DB, but kitchen ticket creation happens client-side after order success callback. If network drops between order creation and ticket creation, order exists without ticket.

**Should Happen**: Kitchen ticket should be created server-side via trigger or in same transaction.

**Status**: ⚠️ KNOWN GAP - Kitchen tickets created by POS client, not via trigger

**Recommendation**: Add database trigger on orders INSERT to auto-create kitchen ticket for cafe orders.

---

### 2. Customer places QR order, then another QR order for same table 5 min later
**Current Behavior**: Two separate orders created for same table.

**Should Happen**: Either merge into single order OR show "Table 3 has existing order" prompt.

**Status**: ✅ ACCEPTABLE - Multiple orders per table is valid use case (different customers)

---

### 3. Order marked ready by kitchen, customer already left (walk-out)
**Current Behavior**: Order stays in "ready" status indefinitely.

**Should Happen**: Staff can mark as "abandoned" or "wasted" with reason.

**Status**: ⚠️ GAP - No "abandoned" status exists

**Recommendation**: Add order status: 'abandoned' with cancellation_reason support.

---

### 4. Same item ordered twice in same order accidentally
**Current Behavior**: Shows as quantity: 2 (correct)

**Status**: ✅ HANDLED

---

### 5. Order with 0 items
**Current Behavior**: POS UI prevents this (submit button disabled when cart empty)

**Status**: ✅ HANDLED at UI level

**Note**: No DB constraint - could be bypassed via API. Consider adding CHECK constraint.

---

### 6. Order placed during closed shift (no active shift)
**Current Behavior**: Order can still be placed. Shows "No shift open" warning banner in POS.

**Should Happen**: Orders should still work (owner might forget to open shift). Cash tracking won't be accurate for that period.

**Status**: ✅ ACCEPTABLE - Warning shown, operations continue

---

### 7. Order total is Rs 0 (free items, 100% discount promo)
**Current Behavior**: Order created with total_cents = 0, payment_status = 'paid' (nothing to collect)

**Status**: ✅ HANDLED

---

### 8. Payment marked as eSewa but no eSewa confirmation
**Current Behavior**: Trust-based - staff marks payment method, no verification.

**Should Happen**: For production, consider eSewa webhook integration for verification.

**Status**: ⚠️ TRUST GAP - No payment verification for digital payments

---

## CUSTOMER EDGE CASES

### 9. Same phone number registers as different names on different visits
**Current Behavior**: First name wins - stored in cafe_customers. Subsequent orders with different names still link to original customer record.

**Should Happen**: Possibly update name if newer, or track aliases.

**Status**: ✅ ACCEPTABLE - Phone is unique identifier, name is informational

---

### 10. Customer phone number is 9 digits instead of 10
**Current Behavior**: No validation - accepts any string.

**Should Happen**: Validate Nepal phone format (10 digits starting with 97/98)

**Status**: ⚠️ VALIDATION GAP

**Recommendation**: Add phone validation in POS UI and possibly DB check constraint.

---

### 11. Two customers share a phone (family phone)
**Current Behavior**: Treated as one customer.

**Status**: ✅ ACCEPTABLE for MVP - single customer profile per phone

---

### 12. Customer visit count increments twice for same order
**Current Behavior**: Fixed with sync_customer_visit_counts() function. Visits now recalculated from actual orders.

**Status**: ✅ FIXED (Feb 18, 2026)

---

### 13. Reward issued to customer who never returns
**Current Behavior**: Reward stays in 'issued' status indefinitely.

**Should Happen**: Auto-expire after configurable period (e.g., 90 days).

**Status**: ⚠️ GAP - customer_rewards table has expires_at column but no auto-expire logic

**Recommendation**: Add pg_cron job to mark expired rewards.

---

### 14. Customer profile shows negative spending (order voided after attribution)
**Current Behavior**: sync_customer_visit_counts() only counts paid orders, so voided orders don't affect totals.

**Status**: ✅ HANDLED

---

### 15. Regular customer orders for a new friend — how do we know there were 2 people?
**Current Behavior**: party_size field exists on orders but rarely used.

**Status**: ✅ FEATURE EXISTS - UI could prompt more often

---

## INVENTORY EDGE CASES

### 16. Owner enters milk as "litres" in one ingredient and "L" in another
**Current Behavior**: Creates two separate ingredients. No deduplication.

**Should Happen**: Normalize units or warn about possible duplicates.

**Status**: ⚠️ GAP - No duplicate detection

**Recommendation**: Add fuzzy matching on ingredient name + unit normalization.

---

### 17. Recipe linked but ingredient stock is 0
**Current Behavior**: Order still goes through. Stock can go negative.

**Should Happen**: Warning shown, but order not blocked (might have unreported stock).

**Status**: ⚠️ PARTIAL - No warning shown currently

---

### 18. Ingredient cost updated after recipes are linked
**Current Behavior**: Recipe margin recalculates automatically (uses current ingredient cost).

**Status**: ✅ HANDLED - Cost is calculated at query time, not stored

---

### 19. Same ingredient used in 10 different recipes — mass deduction on busy day
**Current Behavior**: Each order with recipe-linked item would trigger stock deduction.

**Should Happen**: Batch deductions for performance. Currently no auto-deduction implemented.

**Status**: ℹ️ NOTE - Auto-deduction not implemented. Stock is manual.

---

### 20. Ingredient quantity goes negative
**Current Behavior**: Allowed - no constraint preventing negative stock.

**Should Happen**: Allow negative (represents debt/backorder) but show alert.

**Status**: ✅ ACCEPTABLE with alerts

---

### 21. Owner deletes ingredient linked to active recipes
**Current Behavior**: CASCADE delete would remove recipe_ingredients too.

**Should Happen**: Soft delete or warn before deletion.

**Status**: ⚠️ GAP - Hard delete with cascade

---

### 22. Owner changes ingredient unit (L → ml) after recipes linked
**Current Behavior**: Recipe quantities become wrong (100ml becomes 100L).

**Should Happen**: Block unit change if recipes exist, or offer to convert quantities.

**Status**: ⚠️ GAP - No protection

---

## FINANCIAL EDGE CASES

### 23. Expense added with tomorrow's date
**Current Behavior**: Allowed - expense_date can be any date.

**Should Happen**: Allow future dates for planned expenses.

**Status**: ✅ ACCEPTABLE

---

### 24. Expense deleted after shift is already closed
**Current Behavior**: Variance doesn't recalculate (it's a snapshot at close time).

**Status**: ✅ CORRECT - Historical integrity preserved

---

### 25. Two overlapping shifts (shift not closed before new one opened)
**Current Behavior**: Second shift creation fails if first is still 'open'.

**Status**: ✅ HANDLED - Only one open shift allowed per cafe

---

### 26. Opening float larger than any cash collected (negative variance at close)
**Current Behavior**: Variance shows negative (less cash than expected). Valid scenario.

**Status**: ✅ HANDLED

---

### 27. Fixed cost of Rs 0 entered
**Current Behavior**: Accepted - some costs might genuinely be 0.

**Status**: ✅ ACCEPTABLE

---

### 28. Revenue on a date where no shift was opened
**Current Behavior**: Orders still work. Not linked to any shift.

**Should Happen**: Dashboard/reports still show revenue even without shift.

**Status**: ✅ HANDLED

---

### 29. Udhari customer has Rs 0 outstanding
**Current Behavior**: Udhari feature not implemented (user decision).

**Status**: N/A - Feature not in scope

---

### 30. Partial payment on Rs 80 order
**Current Behavior**: Not supported - payment is all-or-nothing.

**Should Happen**: Consider split payment support for future.

**Status**: ⚠️ GAP - No partial payment

---

## STAFF EDGE CASES

### 31. Two staff members logged in simultaneously on same counter
**Current Behavior**: Both can place orders. taken_by_staff_id tracks who placed each order.

**Status**: ✅ HANDLED

---

### 32. Staff member closes shift they didn't open
**Current Behavior**: Allowed - closed_by tracks who closed.

**Status**: ✅ ACCEPTABLE - Owner trusts staff

---

### 33. Staff deleted after orders attributed to them
**Current Behavior**: Order keeps UUID reference. Name lookup would fail.

**Should Happen**: Soft delete staff or denormalize name on order.

**Status**: ⚠️ GAP - Hard delete breaks references

---

### 34. Staff PIN entered wrong 3 times
**Current Behavior**: No lockout mechanism.

**Status**: ⚠️ SECURITY GAP for future

---

## PROMOTION EDGE CASES

### 35. Happy Hour promo overlaps with flat discount promo
**Current Behavior**: Promotions system exists but conflict resolution unclear.

**Should Happen**: Define precedence rules (highest discount wins? or stack?).

**Status**: ⚠️ NEEDS DEFINITION

---

### 36. Combo promo applied to items currently out of stock
**Current Behavior**: No stock check before promo application.

**Status**: ⚠️ GAP - Promo applied even if items unavailable

---

### 37. Promo end date passes but still showing in POS
**Current Behavior**: Promos have validity dates. Should auto-hide expired.

**Status**: ℹ️ VERIFY - Check if POS filters by validity date

---

### 38. Promo applied to order, then order modified to remove qualifying item
**Current Behavior**: Manual - promo would need to be reapplied/removed.

**Status**: ⚠️ GAP - No automatic promo recalculation

---

### 39. 100% discount promo — does Rs 0 order create kitchen ticket?
**Current Behavior**: Yes - kitchen ticket creation is independent of price.

**Status**: ✅ HANDLED

---

## SYSTEM EDGE CASES

### 40. Nepal timezone (UTC+5:45) — midnight rollover
**Current Behavior**: All date functions use `AT TIME ZONE 'Asia/Kathmandu'`.

**Status**: ✅ HANDLED - Nepal timezone used consistently

---

### 41. New year's day (year boundary)
**Current Behavior**: Date functions handle year boundary correctly.

**Status**: ✅ HANDLED

---

### 42. Feb 29 on leap year in report date ranges
**Current Behavior**: Standard PostgreSQL date handling.

**Status**: ✅ HANDLED

---

### 43. 100+ simultaneous orders (stress test)
**Current Behavior**: Not tested. Supabase handles concurrent connections.

**Status**: ⏳ NEEDS TESTING

---

### 44. Two browsers marking same unpaid order as paid simultaneously
**Current Behavior**: Race condition possible. Last write wins.

**Should Happen**: Optimistic locking or status check before update.

**Status**: ⚠️ RACE CONDITION POSSIBLE

---

### 45. Menu item price changed after in active cart
**Current Behavior**: Cart stores price at add time. Final order uses cart price.

**Status**: ✅ HANDLED - Price locked at cart add

---

### 46. Long menu item name (100+ characters) in kitchen display
**Current Behavior**: CSS truncation or overflow. Not tested.

**Status**: ⏳ VERIFY UI handles gracefully

---

### 47. Cafe slug with special characters
**Current Behavior**: Slugs are normalized (lowercase, hyphens only).

**Status**: ✅ HANDLED

---

### 48. Owner changes their email — records remain linked
**Current Behavior**: Records link via user_id (UUID), not email.

**Status**: ✅ HANDLED

---

### 49. Network drops during shift close
**Current Behavior**: Close is atomic transaction. Either completes or fails.

**Status**: ✅ HANDLED - Atomic transaction

---

### 50. Browser refresh on POS mid-order
**Current Behavior**: Cart is in React state - would be lost.

**Should Happen**: Persist cart to localStorage or DB.

**Status**: ⚠️ GAP - Cart lost on refresh

**Recommendation**: Add localStorage persistence for cart state.

---

## SUMMARY

| Category | Handled | Gaps | Needs Testing |
|----------|---------|------|---------------|
| Order Lifecycle | 4 | 3 | 0 |
| Customer | 5 | 2 | 0 |
| Inventory | 3 | 4 | 0 |
| Financial | 6 | 1 | 0 |
| Staff | 2 | 2 | 0 |
| Promotion | 1 | 4 | 0 |
| System | 7 | 2 | 2 |
| **TOTAL** | **28** | **18** | **2** |

### Critical Gaps to Address Before Production:
1. **Cart persistence** (Edge case #50) - High impact on UX
2. **Kitchen ticket trigger** (Edge case #1) - Data integrity
3. **Phone validation** (Edge case #10) - Data quality
4. **Partial payment** (Edge case #30) - Feature gap for real-world use

### Acceptable for MVP:
- Most inventory edge cases (manual stock management for now)
- Promotion conflict resolution (document behavior, improve later)
- Staff lockout (trust-based system for small cafes)

