# SECURITY FINDINGS
**Audit Date:** Feb 19, 2026  
**Database:** Supabase project `ouwivkmekcycteuydbyg`

---

## 1. RLS STATUS — OVERALL

**Result: 95 of 96 public tables have RLS enabled.**

The one exception:

### 🔴 CRITICAL: `cart_items_backup_20260117` — RLS DISABLED

```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Returns: cart_items_backup_20260117
```

This table contains 8 rows of cart data from January 17, 2026. Because RLS is disabled, any authenticated user making a direct Supabase API call can read ALL rows in this table, regardless of which user they are.

**Risk level:** MEDIUM-HIGH. The data is historical cart items (not financial transactions), but it exposes user IDs, product selections, and quantities for other users.

**Fix:** Either `DROP TABLE cart_items_backup_20260117;` or `ALTER TABLE cart_items_backup_20260117 ENABLE ROW LEVEL SECURITY;`

---

## 2. CROSS-CAFE DATA ISOLATION TEST

**Test:** Can cafe A's owner read cafe B's orders by manipulating the URL?

**Method:** The `/cafe/orders` page uses `cafeId = cafeProfile?.user_id || user.id`. The `cafeProfile` is fetched with `.eq('user_id', user.id)` — it always returns the current user's own profile. The `cafeId` is thus always the authenticated user's own ID.

**Result:** ✅ No cross-cafe data leak via page navigation. The server always derives `cafeId` from the authenticated session.

**However — RPC-level concern:**

The `place_cafe_order`, `get_daily_story`, `get_daily_profit_detailed`, and other RPCs accept `p_cafe_id` as a parameter. If an authenticated user calls these RPCs directly (via Supabase JS client or curl) with another cafe's ID, **do the RPCs enforce that the caller owns that cafe?**

```sql
-- Check place_cafe_order body:
-- It does NOT verify that auth.uid() matches p_cafe_id
-- It inserts orders with ANY cafe_id the caller provides
```

**Finding:** 🔴 HIGH RISK — `place_cafe_order` does not check `auth.uid() = p_cafe_id`. A malicious authenticated user could call this RPC with any cafe's ID and create fake orders for that cafe. This corrupts another cafe's revenue data without needing their credentials.

**Similarly at risk:**
- `get_daily_profit_detailed` — returns another cafe's profit if called with their cafe_id
- `get_daily_story` — same
- `upsert_cafe_customer` — could add phantom customers to any cafe
- `get_kitchen_queue` — could read another cafe's pending orders

**Why not exploited in practice:** The Supabase anon key doesn't grant RPC execution for unauthenticated users; the caller must be authenticated. But any CafeOS user account (even a free signup) could exploit this.

---

## 3. AUTHENTICATION FLOW

**Finding:** All cafe owner pages use `getCurrentUser()` from `@/lib/auth.ts` and check `user.capabilities.canAccessCafeDashboard`. This check is server-side and relies on the user's JWT roles. ✅

**Finding:** Some pages use the older pattern `supabase.auth.getUser()` directly (shift.tsx, customers/page.tsx) without going through `getCurrentUser()`. These pages don't check `canAccessCafeDashboard` — they only check `if (!user) redirect`. ⚠️

This means: if a regular customer (not a vendor) guesses the URL `/cafe/shift`, they won't be blocked by the capability check, only by the data query returning nothing (because their user_id doesn't match any vendor_profiles row).

---

## 4. PUBLIC MICROSITE DATA EXPOSURE

The `/[cafeSlug]` page is fully public — no authentication required. It displays:
- Cafe name, tagline, description
- Opening hours
- Menu items with prices
- Google Maps URL
- WiFi/parking/AC status
- Daily special

**Finding:** ✅ This is intentional and correct. The public microsite only shows data the cafe owner has chosen to publish. No sensitive financial or customer data is exposed.

**Concern:** The microsite loads ALL products with `.eq('vendor_id', vendor.user_id)` and returns all variants and prices. If a cafe has draft or inactive items incorrectly marked `is_active=true`, they'd appear publicly. No exploit, but a UX data hygiene issue.

---

## 5. API KEY EXPOSURE

**Finding:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used in client-side code. This is expected and correct for Supabase — the anon key is designed to be public. RLS is the security layer, not key secrecy.

**Finding:** No `SERVICE_ROLE_KEY` found in any client-side component. ✅

---

## 6. INPUT VALIDATION

**Counter POS phone validation:**
```typescript
const validateNepalPhone = (phone: string): boolean => {
  if (!phone) return true; // Empty is fine (optional)
  const cleaned = phone.replace(/\s|-/g, '');
  return /^(97|98)\d{8}$/.test(cleaned);
};
```

**Finding:** Phone validation is soft — returns a warning message (`setPhoneError`) but does NOT prevent order submission. An order can be placed with an invalid phone number. This means `upsert_cafe_customer` will be called with a malformed phone number and will create a customer record with invalid data.

**SQL injection risk:** All user inputs go through Supabase RPC calls with parameterized queries. ✅ No raw SQL string concatenation found in frontend code.

---

## 7. DEAD PAGES WITH KB STYLISH ADMIN ACCESS

**Finding:** The `/admin/*` routes exist and are accessible if a user has the `admin` role. These are KB Stylish marketplace admin pages, not CafeOS-specific. A CafeOS cafe owner cannot access them (different role requirement). But the routes exist in the same codebase and could create confusion if someone discovers them.

---

## SUMMARY TABLE

| Issue | Severity | Status |
|-------|----------|--------|
| `cart_items_backup` RLS disabled | HIGH | 🔴 Not fixed |
| RPC functions don't verify caller owns cafe_id | HIGH | 🔴 Not fixed |
| Some pages use `getUser()` instead of `getCurrentUser()` | MEDIUM | ⚠️ Partial risk |
| Soft phone validation allows bad customer data | LOW | ⚠️ Data quality |
| KB Stylish admin routes in same codebase | LOW | ℹ️ Identity confusion |
| Cross-cafe data leak via page navigation | NONE | ✅ Protected |
| API key exposure | NONE | ✅ By design |
| SQL injection | NONE | ✅ Parameterized |
