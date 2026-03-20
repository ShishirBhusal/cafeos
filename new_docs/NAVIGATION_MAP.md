# NAVIGATION MAP
**Audit Date:** Feb 19, 2026

---

## ALL ROUTES (from filesystem scan)

### Public Routes
| Route | File Exists | Linked From | Status |
|-------|------------|-------------|--------|
| `/` | ✅ | Direct URL | Works — marketing homepage |
| `/explore` | ✅ | Homepage hero, footer | Works |
| `/[cafeSlug]` | ✅ | /explore cafe cards | Works |
| `/[cafeSlug]/menu` | ✅ | Microsite "View Menu" button | Works |
| `/[cafeSlug]/order/[orderId]` | ✅ | Post-order confirmation | Works |
| `/about` | ✅ | /explore CTA button | Works |
| `/auth/login` | ✅ | All protected redirects | Works |
| `/book-a-stylist` | ✅ | KB Stylish leftover — NOT CafeOS | Irrelevant |
| `/bookings` | ✅ | KB Stylish leftover | Irrelevant |
| `/checkout` | ✅ | KB Stylish leftover | Irrelevant |

### Dead Links on Homepage Footer (NO page.tsx)
| Route | Linked From | Status |
|-------|------------|--------|
| `/features` | Homepage footer "Product" | 🔴 404 |
| `/pricing` | Homepage footer "Product" | 🔴 404 |
| `/support` | Homepage footer "Support" | 🔴 404 |
| `/support/contact` | Homepage footer "Support" | 🔴 404 |
| `/legal/terms` | Homepage footer "Legal" | 🔴 404 |
| `/legal/privacy` | Homepage footer "Legal" | 🔴 404 |

### Cafe Owner Routes (authenticated)
| Route | File Exists | Linked From Dashboard | Status |
|-------|------------|----------------------|--------|
| `/cafe/setup` | ✅ | Auto-redirect on first login | Works |
| `/cafe/dashboard` | ✅ | All cafe pages back-arrow | Works |
| `/cafe/counter` | ✅ | Dashboard primary button | Works |
| `/cafe/kitchen` | ✅ | Dashboard primary button | Works |
| `/cafe/orders` | ✅ | Dashboard "Orders" secondary button | Works |
| `/cafe/orders/[orderId]/pay` | ✅ | Orders list | Works |
| `/cafe/story` | ✅ | Dashboard "Katha" secondary button | Works |
| `/cafe/story/weekly` | ✅ | Dashboard "This Week →" link | Works |
| `/cafe/shift` | ✅ | Dashboard "Hisab" secondary button | Works |
| `/cafe/expenses` | ✅ | Dashboard "Kharcha" secondary button | Works |
| `/cafe/customers` | ✅ | Dashboard tertiary scroll "Customers" | Works |
| `/cafe/menu` | ✅ | Dashboard tertiary scroll "Menu" | Works |
| `/cafe/menu/new` | ✅ | Menu page | Works |
| `/cafe/menu/[id]/edit` | ✅ | Menu page | Works |
| `/cafe/inventory` | ✅ | Dashboard tertiary scroll "Inventory" | Works |
| `/cafe/inventory/recipes` | ✅ | Inventory page | Works |
| `/cafe/inventory/costs` | ✅ | Inventory page | Works |
| `/cafe/reports` | ✅ | Dashboard tertiary scroll "Reports" | Works |
| `/cafe/settings` | ✅ | Dashboard tertiary scroll "Settings" | Works |
| `/cafe/settings/profile` | ✅ | Settings list | Works |
| `/cafe/settings/fixed-costs` | ✅ | Settings list | Works |
| `/cafe/settings/qr` | ❓ | Settings list (status: available) | UNKNOWN — no file found |
| `/cafe/settings/hours` | ❓ | Settings list (status: coming_soon) | Coming Soon placeholder |
| `/cafe/settings/notifications` | ❓ | Settings list (coming_soon) | Coming Soon |
| `/cafe/settings/payments` | ❓ | Settings list (coming_soon) | Coming Soon |
| `/cafe/settings/printer` | ❓ | Settings list (coming_soon) | Coming Soon |
| `/cafe/staff` | ✅ | NOT linked from dashboard | ⚠️ Orphan page |
| `/cafe/tables` | ✅ | NOT linked from dashboard | ⚠️ Orphan page |
| `/cafe/performance` | ✅ | NOT linked from dashboard | ⚠️ Orphan page |
| `/cafe/promotions` | ✅ | NOT linked from dashboard | ⚠️ Orphan page |

### Admin Routes (separate system)
| Route | Status |
|-------|--------|
| `/admin/dashboard` | KB Stylish admin — different product |
| `/admin/*` (10+ routes) | KB Stylish admin — different product |

---

## NAVIGATION GRAPH — PROBLEMS

### Dead Ends (pages with no clear way back or forward)
1. **`/cafe/story/weekly`** — has ArrowLeft back to `/cafe/story`, but not linked from reports. User can go dashboard → story → weekly but not reports → weekly.
2. **`/cafe/orders/[orderId]/pay`** — dynamically generated; no breadcrumb back to orders list
3. **`/cafe/setup`** — onboarding wizard. If user completes step 3 of 4 then closes browser, they restart from step 1 (no progress persistence verified)

### Orphan Pages (no navigation link leads here)
1. **`/cafe/staff`** — exists, accessible by URL, but zero links in dashboard or settings
2. **`/cafe/tables`** — exists, accessible by URL, but zero links in dashboard nav
3. **`/cafe/performance`** — exists, full staff leaderboard, but zero links anywhere
4. **`/cafe/promotions`** — exists, accessible by URL, not linked

### Settings Link That Likely 404s
- `/cafe/settings/qr` — listed as `status: 'available'` in settings.tsx, but no `page.tsx` file found under `src/app/cafe/settings/qr/`. **If this renders a 404, the settings page has a broken active link.**

### Circular/Redundant Pages
1. **`/cafe/story` + `/cafe/story/weekly` + `/cafe/reports`** — three pages covering overlapping data:
   - `/cafe/story`: today's orders, top item, insights (Nepali narrative)
   - `/cafe/story/weekly`: last 7 days, top seller, busiest day (Nepali narrative) 
   - `/cafe/reports`: today/7-days/month with revenue + expenses + profit
   
   **Verdict:** `/cafe/story/weekly` overlaps heavily with `/cafe/reports?period=week`. The weekly page adds "busiest/slowest day" and "new customers" which reports lacks. But rather than a separate route, this data could be a tab or section within `/cafe/reports`. The `/cafe/story/weekly` route adds cognitive load: there are now 3 places to find revenue data, and users don't know which one is "the one".

2. **`/cafe/dashboard` revenue card + `/cafe/reports` + `/cafe/story`** — profit number appears in 3 places. If they ever disagree (due to the timezone bug), the owner won't know which to trust.

3. **`/cafe/shift` + `/cafe/performance`** — shift history with variance is on `/cafe/shift`, staff performance tracking is on `/cafe/performance`. Both are about "how did the day/shift go?" — they should be merged.

---

## DAILY OPERATOR JOURNEY MAP

What a cafe owner actually does each day, and how many taps it takes:

| Task | Path | Taps | Friction |
|------|------|------|---------|
| Morning: Check yesterday's profit | Dashboard → | 0 taps (shown on dashboard) | ✅ Good |
| Start shift | Dashboard → Counter → "Open Shift" | 2 taps | ✅ Good |
| Take an order | Counter → select items → payment | 3-5 taps | ✅ Good |
| Check kitchen queue | Dashboard → Kitchen | 1 tap | ✅ Good |
| Collect payment for unpaid order | Dashboard → Orders → find order → pay | 3 taps | ⚠️ Requires scrolling orders list |
| Add daily expense | Dashboard → Kharcha | 1 tap | ✅ Good |
| Close shift | Counter → "Close Shift" button | Counter has it | ✅ Good |
| View today's story | Dashboard → Katha | 1 tap | ✅ Good |
| Check customer loyalty | (not accessible from dashboard quickly) | 3+ taps | ⚠️ Buried |
| Check inventory levels | Dashboard → Inventory | 3+ taps (scroll tertiary) | ⚠️ Hidden |
| Manage staff | URL manually typed | ❌ No navigation link | 🔴 Broken |
| Manage tables | URL manually typed | ❌ No navigation link | 🔴 Broken |

---

## ROUTES THAT SHOULD NOT EXIST (KB Stylish leftovers in CafeOS)

These routes exist in the codebase but belong to the KB Stylish marketplace, not CafeOS:
- `/book-a-stylist`
- `/bookings`
- `/checkout`
- `/admin/*` (entire admin panel)
- All routes under `src/app/admin/`

**Risk:** A cafe owner who accidentally navigates to `/admin` or `/checkout` will see completely unrelated marketplace functionality, breaking the product's identity.
