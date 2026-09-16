# CafeOS — Handoff

**Last updated:** 16 Sep 2026
**Repo:** https://github.com/ShishirBhusal/cafeos · **Live:** https://cafeos-zeta.vercel.app

---

## 🔴 BLOCKER — the Supabase project no longer exists

This is the first thing to deal with. Everything else below is secondary.

```
nslookup ouwivkmekcycteuydbyg.supabase.co
→ *** can't find ouwivkmekcycteuydbyg.supabase.co: Non-existent domain
```

The host does not resolve at all. A *paused* free-tier project still resolves, so this reads as
**deleted**, not paused. Verified 16 Sep 2026: general internet is fine (google 200), the Vercel
deployment still serves (200 — the homepage is static), but **any page that touches data will fail.**

What this means:
- The demo database — 27 ingredients, 12 recipes, 1,434 orders / 2,187 order items seeded into the
  "Test business" cafe — is gone unless the project can be restored.
- `.env.local` points at this dead project ref (`ouwivkmekcycteuydbyg`).
- The Supabase MCP configured for this repo points at a **different** project
  (`poxjcaogjupsplrcliau`, "kbstylish website"), so it cannot help here.
- `SUPABASE_ACCESS_TOKEN` in `.env.local` is **empty**, so the management API can't be queried either.

**Next step:** log into the Supabase dashboard and find out whether the project was deleted or the ref
changed. If it is gone, a new project must be created, the schema re-applied, and `.env.local` +
Vercel env vars repointed. The re-seed script still exists (see "Seeding" below) and will refill the
demo data once a database is reachable.

---

## Context

CafeOS is a cafe POS / inventory system for Nepal. It is Rabindra's college defense project
(Tribhuvan University). The academic deliverable is the **Random Forest ML service** in `ml-service/`
— see `docs/project-report/DEFENSE_RUNBOOK.md`, which is the authority for defense day and should not
be contradicted.

Work in this session was: fix broken user-level flows, unify the UI, and add two *additional*,
simpler algorithms that are easier to defend verbally.

---

## What was built this session

### Two new algorithms (`src/lib/algorithms/`)

Pure, dependency-free TypeScript. No Python, no ML library, nothing to start before a demo.
**19 unit tests, all passing** (`npx jest src/lib/algorithms`).

| File | What |
|---|---|
| `knn-forecast.ts` | K-nearest-neighbours demand forecast. Predicts next-day units per menu item from the k most similar past days; similarity = circular day-of-week distance. Returns a confidence score (neighbour agreement) and the exact neighbour days, so the UI can show its working. |
| `abc-analysis.ts` | ABC / Pareto inventory classification. Ranks ingredients by consumption value (usage × unit cost), walks the cumulative curve, splits A/B/C at 80% / 95%. |
| `inventory-data.ts` | Data shaping — turns Supabase rows into the inputs both algorithms take. Also `getMenuCostAnalysis()`, which replaced a broken RPC. |

**Dashboard:** `/cafe/inventory/insights` (`src/app/cafe/inventory/insights/page.tsx` +
`src/components/cafe/InsightsClient.tsx`). The client component imports the pure functions directly,
so what is on screen is produced by the exact code in those files — useful when a panel asks.

Last verified numbers (against the now-missing database, for reference):
Doodh Chiya → 26.7 units at **0.88 confidence**; ABC A-class = 9 ingredients (39%) holding
**78.6%** of Rs 69,074.

A one-page PDF describing only the algorithms was generated for Rabindra
(`scratchpad/CafeOS_Algorithms.pdf` — scratchpad is session-temp, regenerate from
`scratchpad/build_summary_pdf.py` if needed).

### Bugs fixed

- **Add Ingredient was unreachable.** The button existed only in the empty state, so once one
  ingredient existed there was no way to add another. Added a persistent button, category filters,
  and an edit flow that did not exist. Delete is now a soft delete (`is_active = false`) so recipes
  and stock history survive.
- **Every menu item reported a fabricated 100% margin.** Food Costs, Recipes and Promotions all
  queried `products.price_cents` — a column that **does not exist** for cafe products. Cafe prices
  live on `product_variants.price` (rupees). Added `getCafeMenuOptions()` and
  `getMenuCostAnalysis()` and pointed all three pages at them.
- **`get_menu_cost_analysis` RPC is stale** — it reads the legacy, empty `recipes` table while real
  data is in `cafe_recipes`. Not fixed in SQL (no DDL access); bypassed in application code instead.
  Worth fixing in a migration when database access returns.
- **Duplicated navbars.** Four cafe pages (Food Costs, Recipes, Promotions, Customer Detail) each
  rendered their own full-screen header on top of the shared sidebar shell. All moved to
  `CafePageLayout`. Separately, the **homepage and `/explore`** each rendered a `<nav>` on top of the
  global `CafeOSHeader`, showing two stacked bars on the live site — both now use the global header,
  which also hides itself on public cafe microsites (`/[cafeSlug]`).
- **Dataset loader**, three real bugs found by running it against live data: the 28-day window was
  anchored on *today* (empty dashboard when data is older); `order_items` was fetched in one request
  against PostgREST's **1000-row cap**, silently dropping two thirds of history and making real
  trading days look like zero-sales days; and a trailing partial day biased every forecast down.
  Fixing these took top-item forecast confidence from **0.00 → 0.90**.
- **Nepal timezone** — dashboard greeting had no "Good night" branch, and "customers today" used the
  server's UTC date rather than Nepal's, mis-scoping the count near midnight.
- **Smart Reorder panel** now hides itself on deployed hosts when the ML service is unreachable,
  instead of showing a permanent "Prediction service offline" banner over four zeroes.
  **On localhost it is unchanged, degraded banner included** — that is the FR-7 fallback the report
  documents and acceptance test MT-01 asserts. Do not delete it outright without updating §4.3.2 of
  the report.
- Removed a fabricated "Nepal's #1" superlative from the site title; wired the already-working QR
  component into Settings in place of a dead "Coming Soon" route.

---

## Open issues

1. **Supabase project missing** — see the blocker above. Nothing else can be verified until fixed.

2. **Currency inconsistency (reported, not yet reproduced).** Rabindra reports "some prices in
   dollars, some in NPR". Investigated 16 Sep: there is **no `$` literal and no USD formatter
   anywhere in `src/`** — greps for `style: 'currency'`, `currency: 'USD'`, `'en-US'` with currency,
   and bare `$` in the cafe/shop/product components all came back empty. The likely cause is a
   **scale mismatch, not a currency one**: `product_variants.price` holds *rupees* (e.g. `40.00`)
   while various `*_cents` columns hold *paisa*, so an item can render as "Rs 40" in one place and
   "Rs 4000" in another and read like two currencies. **Could not be confirmed** because the database
   is unreachable. When it is back: open `/cafe/menu` and `/cafe/counter` side by side, find a
   specific item showing the wrong figure, and trace which field that component reads.
   `src/app/cafe/menu/page.tsx:78` uses `formatPrice(v.price)` (rupees — correct);
   `src/lib/cafe-context.ts` converts with `Math.round(price * 100)` (correct). Suspect anything that
   renders a `*_cents` value without dividing, or a raw `price` as if it were paisa.

3. **KB Stylish products/categories leaking into the cafe** — *partly fixed this session.*
   `getCategories()` in `src/lib/cafe-context.ts` had **no vendor filter at all** and returned every
   category on the platform, so KB Stylish's salon categories appeared in the cafe POS. It now takes
   a `cafeId` and returns only categories that cafe's own active products actually use (derived from
   products rather than `categories.vendor_id`, because a cafe may legitimately use a category row it
   does not own). Both callers updated. **Not verified against a live database** — confirm once the
   DB is back, and check whether actual *products* (not just categories) still leak anywhere.

4. **Vercel auto-deploy is not wired.** `npx vercel git connect` fails with
   `You need admin or write access to the repository "cafeos" to link it (400)` — the Vercel account
   is `divinetechinnovation0-cell` but the repo is under the `ShishirBhusal` GitHub account, and
   Vercel's GitHub App has not been granted access to it. Fix is a one-time click in the Vercel
   dashboard (Settings → Git → Connect, then "Adjust GitHub App Permissions"). See
   `DEFENSE_RUNBOOK.md` §8. **Until then, deploy manually:**
   ```
   npx vercel deploy --prod --yes
   ```
   The CLI is currently authenticated as `divinetechinnovation0-cell`.

5. **Pre-existing TypeScript errors** across the repo (combo pages, admin schedule overrides, some
   tests). `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so builds pass regardless.
   None of them are in code touched this session. Left alone deliberately.

---

## Seeding the demo data

The demo cafe is **"Test business"** (`b40f741d-b1ce-45ae-a5c6-5703a3e9d182`), not "The Tea House"
(`8e80ead5-…`, which holds the original seed but whose orders stop at 18 Feb 2026).

Two scripts were written to the session scratchpad (temporary — recreate if gone):

- `seed_demo.mjs` — clones ingredients / products / variants / recipes from The Tea House into the
  target cafe, then generates 28 days of orders ending yesterday with a day-of-week demand pattern
  (Saturday busiest, as the weekly holiday in Nepal) so KNN has a genuine weekly signal. Idempotent:
  it clears its own previous rows first, identifying its products by the `-tb` slug suffix so the
  cafe's own products are untouched.
- `fix_demo_state.mjs` — post-seed tidy-up. **Necessary**: an order trigger auto-opens a
  `kitchen_tickets` row per order, so seeding left **1,434 pending tickets** that would have flooded
  the Kitchen Display mid-demo. This closes them (leaving 5 live) and draws ingredient stock down to
  a realistic spread — 3 below minimum, 4 on watch, 20 healthy — so Low Stock Alerts and the reorder
  panel have real content instead of "nothing needs ordering".

Both use `scripts/_dbq.mjs`, a small REST helper that reads credentials from `.env.local`.
`scripts/_dbq.mjs` and `scripts/_sql.mjs` are gitignored (local debug tools).

---

## Verification commands

```bash
npx jest src/lib/algorithms                 # 19 tests, should all pass
npx tsc --noEmit -p tsconfig.json           # pre-existing errors elsewhere; touched files are clean
npx vercel deploy --prod --yes              # manual production deploy
```

---

## Where things are

| | |
|---|---|
| Algorithms | `src/lib/algorithms/` |
| Insights dashboard | `src/app/cafe/inventory/insights/`, `src/components/cafe/InsightsClient.tsx` |
| Shared cafe data helpers | `src/lib/cafe-context.ts` |
| Defense day instructions | `docs/project-report/DEFENSE_RUNBOOK.md` |
| Academic report | `docs/project-report/CafeOS_Project_Report.md` |
| Python ML service | `ml-service/` (run `start.bat`, port 8000) |
