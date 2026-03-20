# FEATURES DECISION
**Audit Date:** Feb 19, 2026  
**Rubric:** Would 80% of cafe owners use it in week 1? | Solves problem with no workaround? | Adds confusion if unused? | Can be built without new routes?

---

## PART 1: 10 CANDIDATE FEATURES

---

### 1. WhatsApp Daily Summary (7 AM message with yesterday's numbers)

**Evaluation:**
- 80% would use in week 1? **YES** — Nepal cafe owners are on WhatsApp constantly. A morning message with Rs X revenue, Rs Y profit, N orders is immediately actionable.
- Solves problem with no workaround? **YES** — Currently owners must open the app, wait for dashboard to load, find the profit number. WhatsApp requires zero friction.
- Adds confusion if unused? **NO** — Opt-in by default
- New route needed? **NO** — Toggle in settings

**Verdict: INCLUDE** — This is likely the single highest-ROI feature in this list. It's the difference between CafeOS being "something I check sometimes" vs "something that updates me every morning." WhatsApp API via Twilio or Green API costs roughly Rs 0.08 per message. For 30 messages/month that's Rs 2.50/cafe — negligible.

---

### 2. Staff PIN Login at Counter

**Evaluation:**
- 80% would use in week 1? **YES** — Any cafe with more than 1 person handling the counter needs this. "Who took the Rs 500 order at 3 PM?" is a real question owners ask.
- Solves problem with no workaround? **YES** — Currently all orders are attributed to the cafe owner's account. No staff accountability.
- Adds confusion if unused? **NO** — Single-person cafes just don't use it
- New route needed? **NO** — Add PIN input overlay on counter page

**Verdict: INCLUDE** — Critical for any cafe with staff. Without it, the `/cafe/performance` page (staff leaderboard) shows all orders under one person — which is currently the case.

---

### 3. Udhari / Credit Tracking

**Evaluation:**
- 80% would use in week 1? **YES** — Every Nepal cafe has regular customers who "pay later." This is culturally embedded. Ignoring it means the system's revenue numbers are wrong for anyone using udhari.
- Solves problem with no workaround? **YES** — Currently: owner remembers it in their head or a notebook. Exactly the problem CafeOS should solve.
- Adds confusion if unused? **NO** — Hidden behind "credit" payment option
- New route needed? **MAYBE** — A customer udhari ledger needs a view, but could be in `/cafe/customers/[id]`

**Verdict: INCLUDE** — This is a cultural requirement, not a nice-to-have. A Nepal cafe POS that can't handle "Ram Bahadur ko udhari Rs 450 cha" is missing something NRestro and Hamro SAN both support. DEFER if it means a new route; INCLUDE as a payment option that increments a customer's balance.

---

### 4. Order Modification After Placement

**Evaluation:**
- 80% would use in week 1? **YES** — "Sorry I forgot to add extra sauce" is a daily occurrence at any cafe
- Solves problem with no workaround? **NO** — Workaround: void and re-enter. Painful but possible.
- Adds confusion if unused? **NO**
- New route needed? **NO** — Add "Edit" button on order detail

**Verdict: DEFER** — Important but not blocking. The void-and-reenter workaround exists. Other fixes are more urgent.

---

### 5. Reward Redemption in POS (Currently issues rewards, can't redeem)

**Evaluation:**
- 80% would use in week 1? **MAYBE** — Only if they use the rewards system, which currently has 0 rows in `customer_rewards`
- Solves problem with no workaround? **N/A** — The rewards system doesn't actually issue rewards yet either
- Adds confusion if unused? **YES** — If rewards aren't working, adding redemption creates a fake feature
- New route needed? **NO**

**Verdict: CUT** — The entire rewards system needs to be rebuilt from scratch (0 rewards ever issued). Don't add redemption to a system that doesn't issue anything yet. Start by making issue work, then add redemption.

---

### 6. Table Floor Plan Visualizer

**Evaluation:**
- 80% would use in week 1? **NO** — Only cafes with formal seating arrangements care about floor plans. Most chiya pasals in Nepal have 5-8 tables they know by heart.
- Solves problem with no workaround? **NO** — Table numbers on orders serve the same purpose
- Adds confusion if unused? **YES** — An empty floor plan with no tables is confusing; drag-drop requires setup time
- New route needed? **YES** (already at `/cafe/tables`, orphaned)

**Verdict: CUT** — This is enterprise restaurant software thinking applied to a chiya pasal. The table visualizer already exists and is already orphaned from navigation. It adds complexity without solving a real Nepal cafe problem. Hide it entirely or remove it.

---

### 7. Combo Meal Builder

**Evaluation:**
- 80% would use in week 1? **NO** — Only if they sell combos (e.g., "Tea + Momo Set"). Some do, most don't.
- Solves problem with no workaround? **NO** — Owner can manually enter a "Combo" product
- Adds confusion if unused? **YES** — A combo builder UI visible to cafes who don't use combos creates visual noise
- New route needed? **YES** (or added to menu management)

**Verdict: CUT** — The database already has a `combo_items` table (5 rows) from a previous feature. But it's not surfaced anywhere meaningful. Cut until there's evidence Nepal cafe owners need it.

---

### 8. Inventory Auto-Deduction on Order Completion

**Evaluation:**
- 80% would use in week 1? **NO** — Only works if recipes are linked to menu items. Currently 12 recipes exist out of ~20 menu items. And recipe costs are BROKEN.
- Solves problem with no workaround? **YES** — There's no other way to track stock depletion automatically
- Adds confusion if unused? **YES** — If recipes aren't set up, deductions are wrong and owner sees ghost stock levels
- New route needed? **NO** — Backend trigger only

**Verdict: DEFER** — Fix the recipe cost calculation bug first. Get recipe coverage to >90% of menu items. Then enable auto-deduction. Doing it before fixing recipes means wrong inventory numbers, which is worse than no inventory tracking.

---

### 9. Customer Profile Page (Individual View)

**Evaluation:**
- 80% would use in week 1? **YES** — "Who is Ram Bahadur? How many times has he visited? What does he usually order?" Every cafe owner asks this.
- Solves problem with no workaround? **YES** — Currently the customer list shows a summary but no drill-down. You can't see Ram Bahadur's order history.
- Adds confusion if unused? **NO**
- New route needed? **YES** — `/cafe/customers/[id]`

**Verdict: INCLUDE** — This completes the customer tracking feature that's already half-built. The data exists. The UI is missing one page.

---

### 10. Offline Mode / Cart Persistence on Refresh

**Evaluation:**
- 80% would use in week 1? **YES** — Nepal internet is unreliable. Losing a cart on browser refresh or network drop is a genuine daily risk.
- Solves problem with no workaround? **YES** — If internet drops mid-order, the whole cart is gone
- Adds confusion if unused? **NO** — Invisible when working
- New route needed? **NO** — localStorage already implemented for cart

**Verdict: INCLUDE** — Cart persistence via localStorage is ALREADY IMPLEMENTED (`CART_STORAGE_KEY` in CounterPOSClient). However, **the "Works Offline" claim on the homepage is false** — the cart persists on refresh but orders cannot be submitted without internet. The distinction needs to be clear. What's implemented: ✅ cart survives refresh. What's not implemented: ❌ orders queue and submit when back online.

---

## PART 2: 3 WORD-OF-MOUTH FEATURES

These are features that make a cafe owner call their friend and say "you have to try this."

---

### WOM Feature 1: "Paise Ko Kahani" — Monthly Profit Story in Nepali

**What it is:** On the 1st of every month, the owner opens CafeOS and sees a single, beautifully designed screen that tells them the story of last month in 4 sentences of Nepali. Not numbers in a table. A narrative.

> "Mangalbaarle sabai din maa sabai badi kamai gara — Rs 2,840. Masala Tea le 312 palta bechyo, jun yo mahina ko raja bhayo. Total nafa: Rs 14,200. Aaune mahina ma Aaitabaar bata promotion suru garna socha."

This is not a report. This is a story the owner reads to their spouse over tea.

**Why it creates word-of-mouth:** No Nepali cafe software has ever spoken to an owner like a friend. NRestro gives you a dashboard. Hamro SAN gives you tables. CafeOS tells you a story in your own language. This is the feature that gets shared in Newars' WhatsApp groups.

---

### WOM Feature 2: "Tarkari Alert" — Smart Stock Warning Before Rush Hour

**What it is:** At 10:30 AM, if the system detects that today is Saturday (historically busiest day) AND milk stock is below 2L AND the usual Masala Tea demand on Saturdays is 45 cups, the counter person gets a toast notification: "Saturday ka lagi dudh kamti cha — 15L chahincha, 2L chha."

This requires: recipe-linked inventory + historical order data + push notification.

**Why it creates word-of-mouth:** The owner comes back from the market with exactly the right amount of ingredients because the software told them what to buy before rush hour started. This is the "second brain" moment — the software was thinking even when the owner wasn't. They'll tell every cafe owner they know.

---

### WOM Feature 3: "Aafno Menu QR" — One-Tap Beautiful Menu Card

**What it is:** A button in the dashboard that generates a printable A4 menu card — with the cafe logo, all items with prices, a QR code to scan and order — formatted beautifully, ready to print at any print shop for Rs 30. No design skills required. Click, print, done.

**Why it creates word-of-mouth:** The owner walks into their cafe with a freshly printed menu card and shows it to their regular customers. The QR code points to their CafeOS microsite. Every customer who scans it sees the beautiful cafe page. Word spreads. Other cafe owners ask "where did you get this made?" The answer is "I just clicked a button in CafeOS."

This doesn't require new backend infrastructure — the menu data already exists. It requires a print-optimized page at `/[cafeSlug]/menu?print=true`.
