# FULL AUDIT — PAGE BY PAGE
**Audit Date:** Feb 19, 2026  
**Method:** Read every component file. Run every backing SQL query. Compare what code promises vs what database delivers.

---

## PRE-AUDIT: RESEARCH SYNTHESIS

**Why small businesses stop using POS software:** The #1 reason is that the software doesn't understand how the business actually works. Data is buried behind 10 clicks. Owners use it for 2 weeks then go back to their notebook. CafeOS has 18 routes but staff/tables/performance pages aren't even linked from the nav.

**Nepal POS competitive reality:** NRestro and Hamro SAN are the main competitors. Reviews show owners complain about: slow performance on cheap Android phones, reports that require a data analyst, features that don't work. CafeOS is vulnerable to the same complaints. QR ordering is listed on the homepage but has zero QR-sourced orders in the database. Rewards system has zero rewards issued. Staff management says "Coming Soon."

**What a real "second brain" looks like:** It thinks for you when you're not looking. CafeOS is currently a data entry system — it records what you tell it. A real second brain would tell you at 10 AM "you usually sell 40 Masala Teas on Saturdays, you only have milk for 30, go buy more." None of this exists.

---

## MENTAL MODEL EXERCISES

### Exercise 1: The Honest Conversation
*A cafe owner in Lalitpur, 3 months of use, talking to a friend:*

"Counter POS chai ramro cha. Orders lina kasaiko help chaincha. Tara recipe page vayena — Masala Tea banaucha Rs 1,500 food cost dekhaucha. Rs 40 ko chiya! Report page claim garna paudaina. Staff management — 'Coming Soon.' Settings khol, 5 vata 'Coming Soon' cha. QR code settings click garepachhi 404 aaucha. Customer detail page chaincha — khai? WhatsApp ma daily summary pathaucha bhanya thiyo — aayena. Rs 1,500/month dincha? Abhi? Notebook chitta-pakka cha."

### Exercise 2: Rs 1,500/month Justification
**Works:** Counter POS with cart persistence ✅ | Kitchen display ✅ | Customer visit tracking ✅ | Daily profit math ✅ (timezone wrong) | Shift variance tracking ✅

**Promised but broken:** QR ordering (0 real orders) | Staff management (Coming Soon) | Recipe cost display (catastrophically wrong margins) | Reward redemption (0 rewards ever issued) | Receipt printing (Coming Soon) | All homepage stats (fabricated)

**Honest value:** Rs 500-800/month. The core POS loop works. Everything else is partial or broken.

---

## PAGE 1: Homepage (/)
**Verdict: NOT SHIP-READY**

1. **[CRITICAL]** "50+ Cafes Trust Us" — database has 5 cafe_profiles. This is a lie.
2. **[CRITICAL]** "10K+ Orders Processed" — 1,548 orders, all test data. False.
3. **[CRITICAL]** "Works Offline — No internet? No problem" — False. Cart persists on refresh but orders need internet.
4. **[CRITICAL]** All 3 testimonials fabricated. "Ram Shrestha, The Tea House" is the test cafe owner. "Mountain Brew, Pokhara" and "Green Leaf Cafe, Patan" don't exist.
5. **[HIGH]** "Nepal's #1 Cafe Management Platform" — unsubstantiated. NRestro has more real users.
6. **[HIGH]** "99.9% Uptime" — no uptime monitoring exists. Meaningless claim.
7. **[HIGH]** 6 footer links are 404: `/features`, `/pricing`, `/support`, `/support/contact`, `/legal/terms`, `/legal/privacy`.
8. **[HIGH]** "View Demo Dashboard" requires login. No demo mode exists.
9. **[HIGH]** Step 2 "How It Works" says "Easy drag & drop" for menu. No drag-and-drop exists anywhere.
10. **[MEDIUM]** No product screenshots. Visitors cannot see what they're signing up for.
11. **[MEDIUM]** No pricing information anywhere. Footer `/pricing` is a 404.
12. **[MEDIUM]** "Free forever plan" in hero vs "Join 50+ cafes" in CTA — inconsistent messaging.
13. **[LOW]** "Setup in 5 minutes" — unrealistic for full menu setup with photos/prices/recipes.

---

## PAGE 2: Explore (/explore)
**Verdict: NOT SHIP-READY**

1. **[CRITICAL]** `isOpenNow()` uses `new Date().getHours()` — UTC, not Nepal (UTC+5:45). Shows cafes as "Closed" during Nepal morning rush hour.
2. **[CRITICAL]** "Nepal के 100+ cafes पहिले नै join भइसके" in CTA section. Database has 5 cafes.
3. **[HIGH]** Search is server-side only — full page reload per keystroke on slow 4G. Unusable.
4. **[HIGH]** No Nepali script search. Typing "चिया" returns zero results.
5. **[HIGH]** Slug generated dynamically from business name — duplicate names produce the same URL. No uniqueness enforcement.
6. **[HIGH]** 0 reviews in database. Rating section shows nothing for any cafe.
7. **[MEDIUM]** Area filter shows only 1 area (Dhapakhel) — useless with 5 cafes.
8. **[MEDIUM]** "0 Reviews" displayed publicly in hero stats.
9. **[MEDIUM]** No map view or proximity search.
10. **[LOW]** "Open Now" counter is wrong due to UTC timezone bug.

---

## PAGE 3: Cafe Microsite (/[cafeSlug])
**Verdict: PARTIALLY SHIP-READY — core works, critical details wrong**

1. **[CRITICAL]** `isOpenNow()` uses UTC time — customers see "Closed" during Nepal morning rush.
2. **[HIGH]** Tea House has no logo, no banner (`null`). Looks unfinished.
3. **[HIGH]** `address_line1 = null` for Tea House. No street address shown.
4. **[HIGH]** Slug computed from business name — rename = all QR codes break permanently.
5. **[HIGH]** No slug stored in database — no uniqueness enforcement, two cafes with similar names collide.
6. **[HIGH]** `cafe_reviews = 0` rows — reviews section empty for every cafe.
7. **[MEDIUM]** Daily special price could display as Rs 1.50 if owner inputs Rs 150 thinking it's rupees (unit ambiguity).
8. **[MEDIUM]** QR code points to menu page that may be empty if cafe hasn't set up items.
9. **[MEDIUM]** `latitude = null`, `longitude = null` — coordinates missing, future map features impossible.
10. **[LOW]** Share button — Web Share API fallback on desktop needs verification.

---

## PAGE 4: Dashboard (/cafe/dashboard)
**Verdict: MOSTLY WORKS — timezone bug corrupts all time-aware features**

1. **[CRITICAL]** `getGreeting()` uses `new Date().getHours()` (UTC). At 6 AM Nepal time it shows "शुभ रात्रि" (Good Night).
2. **[CRITICAL]** `getNepaliDay()` uses UTC day — shows wrong weekday from midnight to 5:45 AM Nepal time.
3. **[HIGH]** `DecisionFeedClient` imported — no `get_decision_feed` function found in database. Component may silently fail or crash dashboard.
4. **[HIGH]** Today's profit uses UTC date — shows Rs 0 all morning in Nepal until UTC midnight passes.
5. **[HIGH]** Recent orders: only 4 shown with no indicator that more exist.
6. **[MEDIUM]** Smart nudge `isClosingTime = hour >= 20` fires at 1:45 AM Nepal time, not 8 PM.
7. **[MEDIUM]** "This Week →" link inside Katha card requires stopPropagation — confusing touch target on mobile.
8. **[MEDIUM]** Empty state for zero-order cafes shows two buttons and nothing else. No onboarding guidance.
9. **[LOW]** Uses `vendor_profiles` for cafe name — KB Stylish table in a CafeOS dashboard.
10. **[LOW]** Fixed cost column `frequency` not accounted for in quick profit display.

---

## PAGE 5: Counter POS (/cafe/counter)
**Verdict: CORE WORKS — significant gaps in edge cases**

1. **[HIGH]** 8 of 16 real POS orders have `payment_method = null` — UI isn't always passing payment method correctly.
2. **[HIGH]** No receipt printing — critical for Nepal business operations.
3. **[HIGH]** No order modification after placement.
4. **[HIGH]** Orders can be placed without open shift — no hard enforcement.
5. **[MEDIUM]** Cart not session-isolated — two staff sharing a device see each other's carts.
6. **[MEDIUM]** Phone validation is soft — invalid numbers reach the database.
7. **[MEDIUM]** Variant name in cart shows raw SKU suffix (e.g., "L") instead of "Large" unless SKU follows exact convention.
8. **[MEDIUM]** No stock level visibility while taking orders.
9. **[LOW]** Party size hidden behind "Add customer info" — defaults to 1, analytics always wrong.
10. **[LOW]** Recent customers pill chips show only 5 — other regulars require manual phone entry.

---

## PAGE 6: Kitchen Display (/cafe/kitchen)
**Verdict: ARCHITECTURE CORRECT — almost never tested with real load**

1. **[CRITICAL]** Only worked with real data for 1 day in the product's existence (Feb 18: 8 tickets).
2. **[HIGH]** Unclear if `get_kitchen_queue` joins order_items — kitchen staff may see tickets with no items listed.
3. **[HIGH]** Variant name not shown on tickets — "Masala Tea" without "Large/Small" is ambiguous.
4. **[HIGH]** No individual item completion — whole ticket moves as one unit.
5. **[MEDIUM]** Clock uses browser local time — wrong on misconfigured Android devices.
6. **[MEDIUM]** Sound requires user gesture — first ticket of the day may be silent.
7. **[MEDIUM]** Fullscreen API has inconsistent Android browser support.
8. **[MEDIUM]** 5-second polling delay is noticeable during busy service.
9. **[LOW]** `animate-pulse` on all 15+ minute tickets creates visual noise — nothing stands out.
10. **[LOW]** Order notes may be truncated — "customer allergic to garlic" cut off.

---

## PAGE 7: Orders (/cafe/orders)
**Verdict: BASIC FUNCTION WORKS — pagination and timezone broken**

1. **[CRITICAL]** Hard limit of 100 orders. Busy cafes lose access to earlier orders of the day.
2. **[HIGH]** Date filter uses UTC midnight — Nepal morning orders missed.
3. **[HIGH]** Today's stats use UTC "today" — same timezone bug.
4. **[HIGH]** No pagination — the 100 limit is the only page.
5. **[HIGH]** No order detail view — which items, which variants, which quantities.
6. **[MEDIUM]** No void/cancel order flow.
7. **[MEDIUM]** Search only covers visible 100 orders.
8. **[MEDIUM]** `source` displayed as raw "pos" text — should say "Counter" or "QR Menu."
9. **[LOW]** Design inconsistency — dark header cards vs lighter list rows.
10. **[LOW]** Race condition possible if two staff tap "Collect" on same unpaid order simultaneously.

---

## PAGE 8: Aaja Ko Katha (/cafe/story)
**Verdict: BEST CONCEPT IN THE PRODUCT — execution has systemic issues**

1. **[HIGH]** `get_daily_story` called with UTC date — story shows "0 orders" until after 5:45 AM Nepal time.
2. **[HIGH]** Three separate places to find revenue data (story, reports, dashboard) with no declared source of truth.
3. **[MEDIUM]** Insights are templated strings — not personalized, owner stops reading them after week 2.
4. **[MEDIUM]** Date navigation doesn't persist across page refreshes.
5. **[MEDIUM]** "Top Item" shows product name without variant size.
6. **[MEDIUM]** No action path from insights — story says "busy at noon" but no shortcut to plan staff.
7. **[MEDIUM]** Story may exclude fixed costs from profit calculation (inconsistency with dashboard).
8. **[LOW]** Zero orders → nothing shown. Wrong empty state for day 1 cafe owners.
9. **[LOW]** "Hapta Ko Samiksha" link adds third navigation entry for weekly data.
10. **[LOW]** "Katha ka Kura" section always shows first insight only — remaining insights never rendered.

---

## PAGE 9: Din Ko Hisab / Shift (/cafe/shift)
**Verdict: WORKS FOR BASIC USE — no investigative capability**

1. **[HIGH]** No drill-down into a shift to see which orders contributed to expected cash.
2. **[HIGH]** Shift dates formatted with UTC — Nepal morning shifts show previous day.
3. **[HIGH]** "Expected cash" calculation not explained — owner doesn't know if digital payments are included.
4. **[MEDIUM]** No "open shift" button on this page — must go to /cafe/counter.
5. **[MEDIUM]** SVG variance chart has no Y-axis labels — can't read values on mobile.
6. **[MEDIUM]** "Short Shifts" label sounds like a time-short shift, not a cash-short shift.
7. **[MEDIUM]** Avg variance Rs -39.43 is all test data — the sparkline trend badge is meaningless.
8. **[LOW]** Can't add notes to past shifts retroactively.
9. **[LOW]** "Din Ko Hisab" name collision — same name used for the dashboard profit section.
10. **[LOW]** "Last 30 days" query is UTC-based, could return 29 or 31 days.

---

## PAGE 10: Customer Chinha (/cafe/customers)
**Verdict: DATA LAYER WORKS — no actionable features**

1. **[CRITICAL]** `customer_rewards` = 0 rows. The CustomerRewardsClient component renders prominently but no reward has ever been issued. The "5 customers ready for rewards!" promise is architecturally impossible.
2. **[HIGH]** No customer detail page — can't see Ram Bahadur's order history.
3. **[HIGH]** No search on the page.
4. **[HIGH]** 10 of 15 customers have 0 visits — phantom test data makes the list look populated but is misleading.
5. **[MEDIUM]** Reward eligibility `total_visits % 10 < 3` computed client-side — no persistence or notification when a customer crosses a milestone.
6. **[MEDIUM]** "Usual" items shown from JSONB column — if usual_items is empty, nothing renders.
7. **[MEDIUM]** Phone numbers shown in plain text — no ability to call/WhatsApp from the customer row.
8. **[LOW]** No "at-risk customers" (not visited in 30+ days) section rendered.
9. **[LOW]** Only top 10 customers shown in detail. "All Customers" section capped.
10. **[LOW]** `total_spent_cents` shown but not verified — may not match actual paid orders if customer paid with different phone.

---

## PAGE 11: Expenses (/cafe/expenses)
**Verdict: BASIC FUNCTION WORKS — no historical access**

1. **[HIGH]** Page only loads today's expenses (`gte('expense_date', todayStr)`). Cannot view yesterday's, last week's expenses from this page.
2. **[HIGH]** `todayStr = new Date().toISOString().split('T')[0]` — UTC date. In Nepal morning, loads yesterday's expenses.
3. **[MEDIUM]** No expense editing — can add or delete, not correct a typo.
4. **[MEDIUM]** No recurring expense support — milk cost must be entered fresh every day.
5. **[MEDIUM]** Emoji rendering depends on the bug fix from previous session — needs verification in production.
6. **[MEDIUM]** No expense categories analytics — owner can't see "how much did I spend on dairy this week?"
7. **[LOW]** The `profitData` passed to ExpensesClient — if today has 0 orders (UTC), shows Rs 0 revenue even if Nepal morning had orders.
8. **[LOW]** "Daily Expenses" title — implies only today's expenses are here, which is correct but limits usefulness.
9. **[LOW]** No bulk expense entry — if owner bought 5 items from market, must add 5 separate entries.
10. **[LOW]** No supplier tracking — all supplier_id = null in ingredients.

---

## PAGE 12: Inventory (/cafe/inventory)
**Verdict: BROKEN — column name mismatch in page query**

1. **[CRITICAL]** The inventory page queries `products` with `.select('id, name, price_cents, category_id, categories(name)')`. The actual column name in `product_variants` is `price`, not `price_cents`. The `products` table may have `base_price_cents`. This query may silently return null for prices, breaking the inventory-menu linking display.
2. **[HIGH]** No purchase history view — when was milk last purchased? At what price?
3. **[HIGH]** No stock movement log visible to owner — only current stock, not history.
4. **[HIGH]** All `supplier_id = null` — the supplier management system exists in schema but has 0 suppliers.
5. **[MEDIUM]** "cost per unit" display — `purchase_price_cents / unit_size` is the correct formula but may not be what's shown in the UI (previous bug: showing pack price as unit price).
6. **[MEDIUM]** Deleting an ingredient that has active recipes — what happens to those recipes? No foreign key cascade warning.
7. **[MEDIUM]** No "restock" shortcut — when stock falls below minimum, clicking the alert should open the add-stock modal directly.
8. **[MEDIUM]** Category filter exists ("beverages", "dairy", etc.) but categories are stored as free-text, not from a fixed list — "Dairy" vs "dairy" vs "dairY" would create separate filter options.
9. **[LOW]** `dudh` ingredient (lowercase Nepali transliteration) mixed with English ingredient names — inconsistent naming.
10. **[LOW]** `unit_size` field — the "purchase-first UX" wizard shows pack size but the displayed cost in inventory list needs verification.

---

## PAGE 13: Recipes (/cafe/inventory/recipes)
**Verdict: CRITICALLY BROKEN — wrong column name crashes cost display**

1. **[CRITICAL]** RecipesClient.tsx uses `cost_per_unit_cents` on cafe_ingredients, but the actual column is `purchase_price_cents`. Every recipe cost calculation in the UI returns null or crashes.
2. **[CRITICAL]** Even with correct column, dividing by `unit_size` is required for per-unit cost. The previous session claimed to "fix the -16,567% margin bug" but the underlying column mismatch was not corrected. The fix patched the symptom (servings division) not the cause.
3. **[HIGH]** Only 12 recipes for ~20 menu items. Recipe coverage is ~60%. The intelligence layer (cost analysis, inventory deduction) cannot work for the other 40%.
4. **[HIGH]** Multiple variants of same product (Masala Tea Small/Large) share one recipe — no variant-level recipe support.
5. **[HIGH]** Recipe units in `cafe_recipe_ingredients` (g, ml, pcs) may not match ingredient units (L, kg, loaf) — unit conversion not implemented.
6. **[MEDIUM]** No bulk recipe creation — each recipe must be built item by item.
7. **[MEDIUM]** No waste factor UI — `waste_factor` column exists in schema but there's no input field for it.
8. **[LOW]** Recipe page doesn't show how many orders used this recipe today — no sell-through data.
9. **[LOW]** No recipe duplication — creating similar recipes (Buff Momo Steamed vs Fried) requires starting from scratch.
10. **[LOW]** "Margin %" in the modal — if the fix was applied correctly, Buff Momo shows 16.8% margin. That's very thin. No warning or guidance on healthy margin targets.

---

## PAGE 14: Reports (/cafe/reports)
**Verdict: NUMBERS ARE CORRECT — no charts, timezone wrong, overlap with story**

1. **[HIGH]** Date range calculations use UTC — "today" and "month" boundaries are wrong for Nepal.
2. **[HIGH]** "7 Days" period uses `now.getDate() - 7` without Nepal timezone offset.
3. **[HIGH]** No chart, graph, or trend visualization. Just 4 numbers.
4. **[HIGH]** No top-selling items breakdown — reports show total revenue but not which items drove it.
5. **[HIGH]** No per-day breakdown for week/month — can't see which day was best.
6. **[MEDIUM]** "Daily Expenses" label shows even for weekly/monthly periods — should say "Period Expenses."
7. **[MEDIUM]** Design uses `bg-gray-100` while rest of cafe pages use `bg-stone-50` — inconsistent design system.
8. **[MEDIUM]** Profit margin % calculation: `profitCents / revenueCents` — if revenue is 0, shows "0%", not "N/A."
9. **[LOW]** No export capability — can't download the report as CSV or PDF for an accountant.
10. **[LOW]** `/cafe/story/weekly` covers the same 7-day period with more narrative context. These two pages should be one.

---

## PAGE 15: Weekly Story (/cafe/story/weekly)
**Verdict: WORKS — redundant with /cafe/reports**

1. **[HIGH]** Calls `get_weekly_review` RPC which exists ✅ — but does it use Nepal timezone internally?
2. **[HIGH]** "Khudra Nafa" (gross profit) shown without fixed cost deduction — different from what dashboard shows.
3. **[MEDIUM]** "New Customers" count — how is a "new customer" defined? First order ever, or first order this week? Needs clarification.
4. **[MEDIUM]** Division by zero risk: `busiest_day.orders / slowest_day.orders` in Ke Bujhne section — if slowest_day.orders = 0, shows Infinity%.
5. **[MEDIUM]** Purple/indigo color scheme — different from all other cafe pages (amber/stone). Creates brand inconsistency.
6. **[MEDIUM]** Week navigation links use UTC date — navigating "previous week" could show a week boundary off by 1 day.
7. **[LOW]** "This Week" terminology — confusing whether it means the current 7 days or the calendar week Mon–Sun.
8. **[LOW]** No action items from weekly review — "Busiest day: Saturday" with no "Ensure extra staff on Saturday" next step.
9. **[LOW]** "Full Reports →" button at bottom — navigates to /cafe/reports which shows the same data differently. User may feel these should be the same page.
10. **[LOW]** **This page should not exist as a separate route.** The data is a subset of /cafe/reports. Merge as a "Weekly View" tab.

---

## PAGE 16: Settings (/cafe/settings)
**Verdict: MOSTLY DECORATIVE — 5 of 7 sections non-functional**

1. **[CRITICAL]** `/cafe/settings/qr` is listed as `status: 'available'` (active link) but no `page.tsx` exists — clicking it likely 404s.
2. **[HIGH]** 5 of 7 settings sections are "Coming Soon": Operating Hours, Notifications, Payment Methods, Printer Setup.
3. **[HIGH]** No way to change cafe name or slug from settings.
4. **[HIGH]** No subscription plan visibility — owner doesn't know if/when they'll be charged.
5. **[HIGH]** QR URL uses `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` — shows localhost if env var not set in production.
6. **[MEDIUM]** No timezone setting — the UTC bug has no user-facing fix.
7. **[MEDIUM]** No way to change email or password from settings.
8. **[MEDIUM]** "CafeOS v1.0" shown in footer — this is a placeholder version number.
9. **[LOW]** Operating Hours listed as "Coming Soon" but cafe_profiles already has `opening_hours` JSONB. The data model exists, the UI just wasn't built.
10. **[LOW]** No "Danger Zone" — no way to delete account, export data, or deactivate cafe.

---

## PAGE 17: Staff Management (/cafe/staff)
**Verdict: PLACEHOLDER — zero functional value**

1. **[CRITICAL]** "Invite Staff (Coming Soon)" button does nothing. The entire page is informational only.
2. **[HIGH]** No actual staff accounts linked to a cafe. The page shows "You (Owner)" and a role description, nothing else.
3. **[HIGH]** NOT linked from the dashboard navigation — only accessible by typing the URL.
4. **[HIGH]** The `taken_by_staff_id` column on orders always null — without staff accounts, no order is attributed to a specific staff member.
5. **[MEDIUM]** "Staff Leaderboard" at `/cafe/performance` shows data but is also an orphan page. Two staff-related pages, both unreachable from nav.
6. **[MEDIUM]** Role descriptions are educational but meaningless if roles can't be assigned.
7. **[LOW]** Steps 1–5 described in "How Staff Management Works" — step 1 is "staff creates CafeOS account." A Nepal cafe counter person registering their own CafeOS account is unrealistic.
8. **[LOW]** No PIN-based access model described or hinted at. PIN login would be far more practical for Nepal cafe staff than email registration.
9. **[LOW]** The `canManageCafeStaff` capability check requires the `vendor` role — cafe managers (`cafe_manager`) cannot access this page.
10. **[LOW]** There is no `cafe_staff` table in the database — the feature has no data model.

---

## PAGE 18: Tables (/cafe/tables)
**Verdict: WORKS TECHNICALLY — disconnected from POS, not linked from nav**

1. **[HIGH]** NOT linked from the dashboard navigation — only accessible by URL.
2. **[HIGH]** Only 1 cafe_table in database — the floor plan is nearly empty for Tea House.
3. **[HIGH]** Tables set up here are NOT automatically used by Counter POS — the counter has a text field `tableNumber` but no integration with cafe_tables.
4. **[MEDIUM]** Drag-drop table positioning — useful for large restaurants, overkill for a chiya pasal with 6 tables.
5. **[MEDIUM]** Table status (available/occupied/reserved/cleaning) — "reserved" implies advance reservations. CafeOS has no reservation system.
6. **[MEDIUM]** "Occupied" status shows unpaid order amount — but the order amount is from `get_cafe_tables_with_orders` which joins on `table_number`. If POS uses a text "3" and table has `table_number = 3`, they match. If POS uses "Table 3" and table stores `3`, they don't.
7. **[LOW]** Round/square/rectangle shape distinction — purely cosmetic, no functional difference.
8. **[LOW]** Edit mode drag-drop requires mouse — doesn't work on a touchscreen tablet without special handling.
9. **[LOW]** No "clear table" button after order is paid — table stays "occupied" until someone manually changes status.
10. **[LOW]** Floor plan has fixed dimensions (900×600) — doesn't resize for different screen sizes.

---

## CROSS-CUTTING CONCERNS

### Navigation (see NAVIGATION_MAP.md for full graph)
- 4 orphan pages: `/cafe/staff`, `/cafe/tables`, `/cafe/performance`, `/cafe/promotions`
- 3 redundant pages: `/cafe/story/weekly` vs `/cafe/reports` vs `/cafe/story`
- 6 dead footer links on homepage

### Data Flow (Order → Shift Close)
1. POS order placed → `place_cafe_order()` → orders row ✅, kitchen_ticket row ✅
2. Kitchen ticket created → `kitchen_tickets` → kitchen display polled ✅
3. Payment collected → `mark_order_paid()` → payment_status updated ✅
4. Expense added → `daily_expenses` row ✅
5. Shift closed → `variance_cents` calculated ✅
6. Aaja Ko Katha → `get_daily_story()` → reflects order ✅ (if UTC date matches Nepal date)

**The data flows correctly end-to-end when the POS is used. The UTC timezone bug breaks step 6 (and affects steps 3, 4 date attribution) for the Nepal morning hours.**

### Mobile Audit
- Counter POS on 375px: grid layout collapses to single column — workable but tight
- Kitchen display on tablet: dark full-screen mode works, touch targets are large enough
- Dashboard on 6-inch phone: hero profit number visible above fold ✅, secondary buttons require scroll
- Expenses form: inputs are standard HTML inputs — tap targets may be under 44px minimum
- Customer list: 4-column stats grid at top may be too tight on narrow phones (2×2 is better)
