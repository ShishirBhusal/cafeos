# CafeOS Deep Blueprint v2 — Nepal-First Cafe Management System

**Date**: February 13, 2026  
**Status**: BLUEPRINT — DO NOT IMPLEMENT YET  
**Version**: 2.0

---

## PART 0: WHAT CHANGED FROM v1

v1 was a generic restaurant SaaS feature list. This version is built from:
- Deep research into Nepal cafe/chiya pasal owner realities
- Expert battle simulation across multiple personas
- Analysis of why restaurants fail (pilferage, owner absence, no financial visibility)
- Nepal-specific payment reality (cash + eSewa at end, NOT online ordering)
- Customer behavior reality (shout to order, walk to counter)
- Complete feature audit of 7 Nepal + India competitors
- Corrections: WhatsApp-first won't work (API complexity/cost), per-staff sales tracking doesn't match counter-based billing reality, QR ordering is nice-to-have not killer feature

---

## PART 1: HOW BILLING ACTUALLY WORKS IN NEPAL

Before designing anything, the ground truth of how 95% of Nepal cafes operate:

**CHIYA PASAL (Small — 80% of market):**
Customer sits → Shouts "dai, ek cup chiya!" → Counter person/cook hears → Makes it → Serves → Customer may order more (shouts again) → Customer walks to counter OR asks "kati bhayo?" → Counter person calculates mentally → Customer pays CASH → Leaves.
ONE person at counter does ALL billing. No waiter app. No table assignment.

**MEDIUM CAFE (15% of market):**
Customer sits → Server comes, takes verbal order on paper/memory → Tells counter/kitchen → Food prepared → Served → Customer asks for bill → Counter person calculates from paper slips → Customer pays CASH or scans eSewa/Fonepay QR sticker at counter → Leaves.

**MODERN CAFE / RESTAURANT (5% of market):**
Customer sits → Server takes order (paper/app) → KOT to kitchen → Food served → Bill generated at counter → Customer pays cash/card/eSewa → Leaves. Only THIS segment benefits from KOT, table management, QR ordering.

**Key insight**: The counter is the nerve center. Everything flows through ONE person at the billing counter. Our system lives at that counter.

---

## PART 2: COMPLETE COMPETITOR FEATURE MATRIX (Nepal Market, Feb 2026)

We researched ALL active competitors. Here is every feature they offer:

### 2.1 Nepal Competitors

| Feature | Hamro SAN | RestroX | NRestro | Restronp | TI Restro | Aaryatm |
|---------|-----------|---------|---------|----------|-----------|---------|
| **POS / Billing** | Y | Y | Y | Y | Y | Y |
| **KOT (Kitchen Order Ticket)** | Y | Y | Y | Y (auto-print, priority) | Y | Y (KOT+BOT) |
| **Menu Management** | Y | Y | Y | Y | Y | Y |
| **Inventory / Stock** | Y | Y (+ waste control) | Y | N | N | Y |
| **Reports / Analytics** | Y (daily summary) | Y (real-time) | Y (advanced) | N | Y (basic) | Y |
| **Table Management** | Y | Y (space mgmt) | N | Y (booking) | Y (floor plans) | N |
| **Digital QR Menu** | Y (Gold+) | Y | Y | N | Y | N |
| **Multi-device** | Y (mobile/tablet) | Y (all + KDS) | Y (mobile app) | Y (all) | N | Y |
| **Multi-branch** | N | Y | Y | N | N | Y |
| **Recipe Management** | Y | N | N | N | N | N |
| **Accounting (AR/AP)** | Y (full ERP) | Y (expense mgr) | N | N | N | N |
| **Purchase Orders** | Y (Gold+) | N | N | N | N | N |
| **Production Mgmt** | Y (Gold+) | N | N | N | N | N |
| **Fonepay/eSewa** | N | Y | Y (dynamic QR) | N | N | Y |
| **IRD-Approved Billing** | N | Y | N | N | N | N |
| **Staff Management** | N | Y (performance) | Y (user mgmt) | N | Y (shifts) | Y (HR/salary) |
| **Customer Feedback** | N | N | N | N | N | N |
| **Loyalty Program** | N | N | N | N | N | N |
| **Customer CRM** | N | N | N | N | N | N |
| **Bulk SMS** | N | N | Y | N | N | N |
| **Waste Tracking** | N | Y | N | N | N | N |
| **Partywise Pricing** | Y | N | N | N | N | N |

### 2.2 India Reference — Petpooja (100,000+ restaurants)

Features Nepal competitors DON'T have but Petpooja does:
- **Captain App** — Server takes orders on phone at table, sends to POS+kitchen
- **Kitchen Display System (KDS)** — Screen in kitchen showing order queue
- **Waiter Calling System** — Hardware device on table with buttons
- **Scan & Order** — QR-based ordering from table
- **Token Management** — Screen showing takeaway order status
- **Reservation Manager** — Multi-channel table booking
- **Business Website Builder** — Each restaurant gets a website
- **Loyalty Wallet** — Points, redemption, top-up
- **SMS Marketing** — Personalized campaigns from dashboard
- **Customer Feedback** — App, SMS link, QR on bill
- **Online Order Reconciliation** — Compare aggregator payouts vs actuals
- **Revenue Leakage Detection** — Anti-theft system
- **Dynamic Reports** — 80+ customizable report types
- **CRM** — Customer history, preferences, personalization

### 2.3 Pricing Comparison

| Competitor | Lowest Tier | Mid Tier | Top Tier |
|-----------|------------|----------|----------|
| **Hamro SAN** | Silver (1 user, 10 tables, 500 items) | Gold (6 users, 20 tables) | Platinum (unlimited) |
| **RestroX** | Free 14-day trial then paid | — | — |
| **NRestro** | Basic (700 orders/mo) | Premium (unlimited) | Enterprise (unlimited outlets) |
| **Restronp** | Free | — | — |
| **TI Restro** | Rs 599/mo (Chiya Pasal) | Rs 999/mo (Single Kitchen) | Custom |
| **Aaryatm** | Custom pricing | — | — |
| **Petpooja** (India) | ~Rs 1,000/mo + add-ons | ~Rs 2,000/mo | Custom |

**Key observation**: No competitor has transparent pricing on their website (except TI Restro). All say "Contact Us." This is a barrier for hesitant small owners. We should have clear, public pricing.

---

## PART 3: GAP ANALYSIS — WHAT NOBODY DOES WELL OR AT ALL

| Gap | Why It Matters | Who Has It? |
|-----|---------------|-------------|
| **Udhari/Credit tracking** | Every cafe gives credit. Paper khata fails. Rs thousands vanish. | NOBODY. Hamro SAN has AR/AP but that's ERP accounting, not "dai paxi dinchu" scenario |
| **Automatic daily profit calculation** | Owners don't know if they're making money. Revenue ≠ Profit. | NOBODY. All show revenue reports, none calculate actual profit (revenue minus expenses minus fixed costs) |
| **Cafe's own web presence / microsite** | Most cafes have zero online presence. Tourists and youth discover via Google/Instagram. | NOBODY in Nepal. Petpooja has it in India only |
| **Cafe discovery platform** | Customers can't find new cafes digitally. No Nepal-specific cafe directory. | NOBODY. Each POS is standalone with no network effect |
| **Ingredient-level auto-deduction** | Track raw materials not just finished items. Know when supplies run out. | NOBODY properly. Hamro SAN has recipe mgmt but ERP-complex |
| **Customer recognition at counter** | "Ram dai, usual order?" — personalized service at billing time | NOBODY in Nepal. Petpooja CRM is closest but requires complex setup |
| **Smart menu pricing guidance** | "Your momo costs Rs 62 to make, you sell at Rs 120, margin is 48%" | NOBODY calculates food cost per item and suggests pricing optimization |
| **End-of-day cash reconciliation** | "System says Rs 12,000 cash but drawer has Rs 11,400" — simple anti-theft | NOBODY offers a dedicated closing/reconciliation flow |
| **IRD-ready billing + tax export** | Nepal IRD compliance is becoming mandatory for hospitality above NPR 5 crore | Only RestroX (partially) |
| **Supplier purchase tracking** | "I spent Rs 45,000 on supplies this month from 5 suppliers" | Only Hamro SAN but buried in full ERP complexity |

---

## PART 4: CAFEOS COMPLETE FEATURE SET

### 4.0 Design Philosophy

Every feature must pass THREE tests:
1. **Does the counter person use it in under 3 seconds per action?** If billing is slower than paper, staff won't use it.
2. **Does the owner see value on DAY ONE?** If it takes a month to show results, they'll cancel.
3. **Does it solve a REAL daily pain?** Not "nice to have." Does it save money, save time, or bring customers?

The interface language is **Nepali first, English optional.** Buttons are BIG. Text is MINIMAL. It works on a Rs 15,000 Android phone.

---

### 4.1 BASELINE FEATURES — Best of All Competitors (We MUST Have All)

These are table-stakes. Every serious competitor has them. We include all, built to be simpler and faster.

#### BF-1: Counter Billing (POS)
**Source**: Every competitor | **Our edge**: Fastest in market — designed for counter-based flow

- Large tap-target buttons organized by category (Drinks, Snacks, Meals, Cigarettes, etc.)
- One tap = add item. Long press = custom quantity.
- Running total always visible
- Payment mode: Cash, eSewa, Fonepay, Khalti, Credit (Udhari)
- Bill number auto-generated
- Discounts (% or fixed amount)
- Void/cancel bill with reason (logged for audit)
- Works OFFLINE — syncs when internet returns (critical for Nepal)
- Nepali language interface
- Print receipt via Bluetooth thermal printer (optional)
- **Speed target**: Complete a 3-item bill in under 8 seconds

#### BF-2: Kitchen Order Ticket (KOT)
**Source**: RestroX, NRestro, Restronp, TI Restro

- When bill created, KOT auto-sent to kitchen (printer or screen)
- Shows: items, quantity, special notes, table/token number, time
- Priority flag for urgent orders
- Cook marks items as "ready" → counter sees notification
- KOT history searchable
- Separate KOT for bar (BOT) if applicable

#### BF-3: Menu Management
**Source**: Every competitor | **Our edge**: Add item in 30 seconds with phone camera photo

- Categories: create unlimited (Drinks, Snacks, Meals, etc.)
- Items: name (Nepali + English), price, description, photo (phone camera snap), preparation time
- Variants: sizes (small/large), add-ons (extra cheese, extra spicy)
- Mark items available/unavailable (instant update everywhere)
- Bulk price update (e.g., "increase all drink prices by Rs 5")
- Seasonal items (auto-enable/disable by date)
- Item display order drag-and-drop

#### BF-4: Inventory & Stock Management
**Source**: Hamro SAN, RestroX, NRestro

**Simple Mode** (for chiya pasals — track finished items):
- Track stock count of sellable items: cigarette packets, cold drinks, biscuits
- Manual stock entry: "Received 50 Surya packets" / "Current stock: 23"
- Low-stock alerts when below threshold
- Stock audit: compare system count vs physical count

**Advanced Mode** (ingredient-level — see Unique Feature UF-4 below)

#### BF-5: Reports & Analytics Dashboard
**Source**: Every competitor | **Our edge**: Visual, mobile-first, Nepali language, actionable

- **Daily Sales Summary**: Total revenue, order count, avg order value, payment method breakdown
- **Item-wise Sales**: Which items sold how many, revenue per item, ranked
- **Hourly Sales Pattern**: When is your cafe busiest? Visual heatmap
- **Daily/Weekly/Monthly Comparison**: Trend lines showing growth/decline
- **Payment Mode Report**: Cash vs eSewa vs Fonepay vs Khalti vs Udhari split
- **Category Performance**: Which category (drinks/snacks/meals) drives most revenue
- **Cancelled/Voided Bills Report**: How many, why, audit trail
- **Discount Report**: How much given away in discounts
- Owner views ALL reports on phone. No need to be at the shop.

#### BF-6: Table Management (Optional — Off by Default)
**Source**: TI Restro, RestroX, Hamro SAN

- Visual floor plan (drag-and-drop layout builder)
- Table status: free / occupied / waiting for bill
- Assign orders to tables
- Merge tables (group dining)
- Split bills per table
- Table turnover reporting
- **Off by default** for chiya pasals. Enabled for cafes/restaurants that want it.

#### BF-7: Digital QR Menu
**Source**: RestroX, NRestro, TI Restro

- Each cafe gets a digital menu page (ties into Unique Feature UF-3)
- Auto-generated QR code linking to the menu
- Printable QR card (PDF download)
- Menu updates from app reflect instantly on QR page
- Shows: categories, items, prices, photos, availability
- Default: browse-only (ordering happens verbally)
- For larger cafes: optional QR Order mode where customer CAN place order from phone

#### BF-8: Multi-Device Support
**Source**: RestroX, Restronp

- Android phone (primary — 90% of Nepal cafe staff use Android)
- Android tablet
- Desktop browser (for owner wanting bigger screen)
- Kitchen display on any screen (old tablet, monitor)
- Thermal printer support (Bluetooth + USB)
- Designed for 4G/3G connections (lightweight, fast loading)
- Full offline mode with sync

#### BF-9: Fonepay / eSewa / Khalti Integration
**Source**: NRestro (Fonepay), RestroX

- Generate dynamic Fonepay QR code per bill
- Customer scans with ANY Fonepay-compatible app (eSewa, Khalti, mobile banking)
- Payment auto-confirmed → bill marked as paid
- Also supports: manual entry for static QR sticker payments at counter
- Daily digital payment reconciliation report

#### BF-10: Multi-Branch Support
**Source**: NRestro, RestroX, Aaryatm | **Our edge**: Architecturally native from KB Stylish multi-vendor system

- Owner manages multiple cafe locations from one login
- Each branch has its own menu, inventory, staff, reports
- Consolidated reporting across all branches
- Transfer stock between branches
- Compare branch performance

#### BF-11: Kitchen Display System (KDS)
**Source**: RestroX, Petpooja

- Runs on any old tablet or phone mounted in kitchen
- Shows incoming orders in queue format
- Color-coded by age (green = new, yellow = 5+ min, red = 10+ min)
- Cook taps to mark "preparing" → "ready"
- Counter sees "ready" notification
- Audio ping for new orders

#### BF-12: User Management & Roles
**Source**: NRestro, TI Restro, RestroX

- **Owner**: Sees everything. Full control. Reports, settings, billing.
- **Counter Staff**: Can create bills, mark payments, do end-of-day closing. Cannot change menu, prices, or view financial reports.
- **Kitchen Staff**: Can see KOT queue and mark items ready. Nothing else.
- Each user has PIN login (4 digits). No email/password needed for staff.

#### BF-13: Waste Tracking
**Source**: RestroX

- Quick entry: select item/ingredient → quantity wasted → reason (expired, dropped, burnt, returned)
- Daily waste summary
- Monthly waste report: "You wasted Rs 3,200 worth of ingredients this month"
- Trend: is waste increasing or decreasing?
- Top wasted items ranking

---

### 4.2 UNIQUE FEATURES — What NOBODY in Nepal Offers (Our Differentiators)

These are CafeOS-exclusive. These are the reasons a hesitant owner says "yo ta chahiyei." Each is designed for Nepal market reality.

---

#### UF-1: "Udhari Khata" — Digital Credit/Tab Management

**The problem**: Every cafe gives udhari (credit) to regulars. "Paxi dinchu dai" is heard 10-20 times/day. Paper khata gets wet, torn, lost. Customers deny. Owner forgets. Thousands of rupees vanish monthly. Estimated 30-40% of paper udhari is never recovered.

**Why no competitor has this**: POS systems worldwide assume payment at point of sale. Running customer tabs that accumulate over days/weeks without formal accounts is uniquely South Asian. Hamro SAN has "Accounts Receivable" but that's ERP double-entry bookkeeping — not "Sunita didi owes Rs 340 from last Tuesday."

**How it works**:

1. **At billing**: Counter person creates bill → selects "Udhari" as payment → selects or adds customer (name + phone). Bill saved as unpaid.

2. **Customer ledger**: Each customer has a running balance:
   - Sunita Tamang — 9841XXXXXX
   - Magh 28: Chiya x2 + Momo x1 = Rs 170 (unpaid)
   - Magh 30: Chiya x1 = Rs 25 (unpaid)
   - Falgun 1: Paid Rs 100 (partial)
   - Balance: Rs 95

3. **Dashboard**: Total udhari outstanding across all customers, sorted by amount and age:
   - Total Outstanding: Rs 8,450 (from 23 customers)
   - Over 30 days: Rs 2,100 (5 customers)
   - 15-30 days: Rs 3,200 (8 customers)
   - Under 15 days: Rs 3,150 (10 customers)

4. **SMS Reminders**: One-tap SMS to customer: "Namaste! Tapai ko Rs 95 udhari baki cha [Cafe Name] ma. Dhanyabad!" Uses bulk SMS (cheap, works on any phone — not WhatsApp API).

5. **Settlement**: Customer pays (full or partial) → counter records it → balance auto-updates → full audit trail.

6. **Analytics**:
   - Monthly udhari report: given vs recovered vs written off
   - Customer reliability score: who always pays vs who never does
   - Aging report: flag accounts overdue 30, 60, 90 days

**Why it's worth the subscription alone**: If a chiya pasal recovers even Rs 2,000 extra per month from better tracking (very conservative), that exceeds the subscription cost.

---

#### UF-2: "Hisab Kitab" — Daily Profit Calculator with Expense Tracking

**The problem**: Nepal cafe owners know roughly what they sold. They have NO IDEA what they actually profited. They buy supplies daily with cash, pay rent, pay staff — all from the same cash drawer. End of month: "paisa kata gayo?"

**Why no competitor has this properly**: Every POS shows SALES reports. Nobody shows PROFIT. Because profit requires EXPENSES — and no POS tracks the small daily cash purchases at the local bazaar.

**How it works**:

1. **Quick Expense Entry** (10 seconds): Owner taps category (Dudh, Sabji, Grocery, Cigarettes, Fuel, Other) → enters amount → optional supplier name → paid or baaki → save.

2. **Fixed Monthly Costs** (entered once): Rent, staff salary, electricity, internet, etc. System auto-divides into daily share.

3. **Daily Profit Display**:
   - Aamdani (Revenue): Rs 12,450
   - Kharcha (Daily expenses): Rs 4,200
   - Fixed cost (daily share): Rs 1,983
   - **Aajako Nafa (Profit): Rs 6,267**

4. **Monthly P&L** (auto-generated):
   - Revenue breakdown by category
   - Expense breakdown by category
   - Fixed costs
   - Net profit
   - Comparison with previous month
   - **Exportable as PDF** — useful for bank loans, tax filing

5. **Supplier Ledger** (built into expense tracking):
   - Track which supplier you owe how much
   - "Ram Dairy: Rs 3,000 baaki from last 15 days"
   - Settlement tracking
   - Monthly supplier-wise spending report

**Why it's a game-changer**: For the first time, the owner KNOWS their real profit. Not guessing. This changes how they make every decision — pricing, staffing, menu changes, expansion.

---

#### UF-3: "Mero Cafe" — Automatic Microsite + Digital Presence for Every Cafe

**The problem**: Most Nepal cafes have ZERO digital presence. No Google listing. No website. No shareable menu link. Tourists search "cafe near me" — these cafes are invisible. Printing paper menus costs Rs 5,000-15,000/year.

**Why no Nepal competitor has this**: POS companies sell tools for operations (billing, KOT). They don't think about marketing or customer discovery. Petpooja in India has a "Business Website" add-on but nobody in Nepal offers it.

**How it works**:

1. **Automatic microsite**: When cafe signs up and adds menu, they get: `cafeos.com.np/ram-ko-chiya-pasal`
   - Cafe name, photos, banner
   - Address with Google Maps embed
   - Hours, phone number
   - Full menu: categories, items, prices, photos, availability
   - "Aajako Special" section (optional daily special)
   - Customer reviews (star rating + comment)
   - Share buttons: WhatsApp, Facebook, copy link

2. **QR code auto-generated**: Printable PDF with cafe's QR code. Stick on wall or table. Customer scans → sees menu on phone. For browsing, not ordering.

3. **SEO optimized**: Google indexes these pages. "chiya pasal Baneshwor" search might surface this cafe. Free organic traffic.

4. **Facebook shareable**: Owner shares link on personal Facebook, local groups. Friends see a professional page. This is how small businesses in Nepal actually market.

5. **Always current**: Owner changes a price in app → website updates instantly. No reprinting.

6. **Google Business Profile guidance**: Step-by-step Nepali instructions to claim/create their Google Maps listing, linking back to their cafeos page.

**Real value**: Gives a Rs 15,000-rent chiya pasal the same digital presence a Rs 5 lakh/month restaurant pays a marketing agency for.

---

#### UF-4: "Saman Hisab" — Ingredient-Level Smart Inventory with Recipe Costing

**The problem**: Most cafes track finished items (if at all). Nobody tracks INGREDIENTS: tea leaves, milk, sugar. So they don't know: When will I run out? How much does each cup of chiya ACTUALLY cost me? Am I pricing correctly?

**Why no competitor does this properly**: Hamro SAN has "Recipe Management" buried in ERP complexity (production management, fixed assets, journal entries). A chiya pasal owner will never navigate that.

**How it works**:

1. **One-time setup** — Owner defines recipes per menu item:
   - Chiya (1 cup): Tea leaves 10g, Milk 100ml, Sugar 15g
   - Momo (1 plate, 8 pcs): Flour 100g, Buff mince 120g, Onion 30g, Oil 10ml
   - We provide TEMPLATES for common Nepali cafe items. Owner just adjusts quantities.

2. **Auto-deduction**: Every bill with "Chiya x2" auto-deducts: 20g tea leaves, 200ml milk, 30g sugar.

3. **Stock dashboard**:
   - Tea leaves: 1.2 kg left → ~120 cups → ~1 day warning
   - Milk: 8 L left → ~80 cups → 0.7 days critical
   - Sugar: 3 kg left → ~200 cups → 1.7 days ok
   - Buff mince: 2 kg left → ~16 plates → 1 day warning

4. **Shortage alerts**: When ingredient drops below threshold → push notification.

5. **Food cost per item** (the real gold):
   - Chiya: Ingredients cost Rs 8, sells Rs 25, margin 68%
   - Momo (buff): Ingredients cost Rs 62, sells Rs 120, margin 48%
   - Sandwich: Ingredients cost Rs 48, sells Rs 80, margin 40%

6. **Pricing guidance**: "Your momo food cost is 52%. Industry standard is 28-35%. Consider increasing price to Rs 150 or finding cheaper supplier."

**Why this matters**: A cafe selling momo at Rs 120 with food cost Rs 62 (52%) is bleeding money after labor+rent. They don't know this. This feature tells them EXACTLY which items make money and which don't. Industry research shows this alone can increase profitability by 3-8%.

---

#### UF-5: "Cafe Discover" — Network Discovery Platform

**The problem**: POS systems help cafes operate. They do NOTHING to help cafes get MORE CUSTOMERS. Every cafe owner's #1 wish is more customers. We can uniquely solve this because we're a platform.

**Why no competitor can do this**: Each POS is standalone. No shared network. We can show ALL cafes on CafeOS because we ARE the platform.

**How it works**:

1. **cafeos.com.np/explore** — Public discovery page:
   - Search by location (Baneshwor, Thamel, Lakeside, etc.)
   - Filter by type (chiya pasal, cafe, restaurant, cottage)
   - See menu, photos, rating, hours for each
   - Click to get directions (Google Maps link)
   - Share on WhatsApp/Facebook

2. **Growth loop**:
   - More cafes join → more on discovery platform → more customers use it → cafe owners see customers coming from CafeOS → tell other owners → more cafes join

3. **SEO power**: Each cafe page ranks in Google individually. The explore page ranks for "cafes in [location]". Combined SEO footprint grows with every new cafe.

4. **Owner incentive**: "Join CafeOS and get listed on Nepal's growing cafe directory where hundreds of people find new cafes daily." No competitor can match this.

5. **Future monetization**: Featured/promoted listings, area "best of" lists, tourist guide partnerships.

---

#### UF-6: "Customer Chinha" — Repeat Customer Recognition & Simple Loyalty

**The problem**: A chiya pasal's biggest asset is regulars. Ram dai comes every morning. The counter person knows him by face. But there's no data, no tracking, no way to reward loyalty. When counter person changes, all relationship knowledge vanishes.

**Why this is different from Petpooja CRM or loyalty apps**: Those require the CUSTOMER to download an app, scan a card, create an account. Nepal chiya pasal customers will NEVER do that. Our system works at COUNTER LEVEL — counter person tags the customer.

**How it works**:

1. **At billing** (optional, 3 seconds): Counter person taps "Customer?" → types phone number or selects from recent list. Bill is tagged.

2. **Over time**, system builds profile:
   - Ram Bahadur — 9841XXXXXX
   - Visits: 47 (since Kartik 2082)
   - Frequency: Almost daily (Mon-Fri)
   - Usual order: Chiya x1 + Surya x1
   - Avg spend: Rs 45/visit
   - Total spent: Rs 2,115

3. **Counter recognition prompt**: When number entered:
   - "Ram Bahadur — Regular! 47th visit. Usual: Chiya + Surya. [Quick Bill: Usual Order Rs 45]"
   - ONE TAP to create the entire bill for a regular.

4. **Simple loyalty** (no app, no card, no QR for customer):
   - Owner sets rule: "After every 10 visits, offer 1 free chiya"
   - System tracks via phone number
   - At 10th visit: "Ram Bahadur 10th visit! Free chiya eligible!"
   - Counter person says: "Ram dai, aaja ko chiya hamro taraf bata!"
   - Ram feels valued. Tells friends. Comes back more.

5. **Targeted bulk SMS** (optional paid add-on):
   - "Send to customers not visited in 30 days": win-back message
   - "Send to all regulars": special offer announcement
   - Based on REAL visit data, not random phone list

6. **Customer insights**:
   - "45 regular customers (5+ visits)"
   - "Top 10 by spending"
   - "12 haven't visited in 30+ days"
   - "Average 2.3 visits before becoming regular"

---

#### UF-7: "IRD Sajilo" — Tax Compliance Made Easy

**The problem**: Nepal's IRD is cracking down. Restaurants/cafes with revenue > NPR 5 crore MUST use IRD-approved e-billing. Even smaller ones need PAN-compliant bills. Most small cafes ignore this until fined.

**How it works**:
- PAN/VAT number printed on every bill automatically
- Invoice numbering per IRD format
- Bill contains: seller PAN, buyer PAN (optional), date, items, VAT breakdown
- Export all bills for fiscal year as CSV/PDF for tax filing
- Daily/monthly tax summary report
- Work toward IRD CBMS (Central Billing Monitoring System) integration
- Export format matches what accountants expect

**Value**: Owner tells accountant "here's my complete digital billing record for the year." Saves Rs 10,000-20,000 in accountant fees and avoids fines.

---

#### UF-8: "Din Ko Hisab" — End-of-Day Cash Reconciliation

**The problem**: At closing, counter person counts cash and goes home. Owner has no idea if count matches what should be there. This is the simplest anti-theft tool.

**How it works**:

1. Counter person hits "Close Day" at end of shift
2. System shows: Total bills, cash sales expected, digital sales, udhari given
3. Counter person counts physical cash and enters amount
4. System calculates difference:
   - Expected cash: Rs 9,200
   - Actual cash: Rs 8,900
   - Difference: -Rs 300 (flagged)
5. Difference is LOGGED daily. Over time:
   - "Average daily cash difference this month: -Rs 180"
   - Consistently negative = money leaking
   - Near zero = operations clean
6. Owner sees closing history from phone with trend line

**Why powerful**: Doesn't accuse anyone. Just math. But math doesn't lie. A consistent Rs 200/day shortfall = Rs 6,000/month leak the owner now SEES for first time.

---

#### UF-9: "Smart Menu Insights" — Data-Driven Menu Optimization

**The problem**: Owners price menus by copying competitors or guessing. They don't know which items are stars (high sales + high margin) and which are dogs (low sales + low margin, wasting space and ingredients).

**How it works** (after 2-4 weeks of data):

1. **Menu Performance Matrix**:
   - **Stars** (High Sales + High Margin): Promote these. E.g., Chiya — 3,200 sold, Rs 17 margin (68%).
   - **Workhorses** (High Sales + Low Margin): Increase price. E.g., Cigarettes — can't change pricing, consider bundling.
   - **Puzzles** (Low Sales + High Margin): Promote harder. E.g., Cold Coffee — 45 sold, Rs 85 margin (71%).
   - **Dogs** (Low Sales + Low Margin): Consider removing. E.g., Green Tea — 12 sold, Rs 8 margin (40%).

2. **Price simulation**: "If you increase momo price by Rs 10, assuming same volume, monthly profit increases Rs 4,200."

3. **Bundle suggestions**: "Customers who order chiya also order momo 34% of the time. Consider Chiya+Momo combo at Rs 135."

4. **Seasonal insights**: "Cold drinks sell 3x more in Jestha-Ashadh. Consider seasonal pricing."

---

#### UF-10: "Cafe Control" — Owner's Remote Dashboard (Mobile-First)

**The problem**: Owner absence anxiety. Can't be at cafe 24/7 but needs to know what's happening.

**Why different from other apps' "reports"**: Other apps have reports you dig through. This is a PURPOSE-BUILT owner view showing the 5 things they care about in ONE SCREEN:

1. **Today's revenue** (live, compared to yesterday same time)
2. **Today's orders count + avg order value**
3. **Saman alerts** (any ingredient running low)
4. **Udhari outstanding total**
5. **Last 5-10 bills** (see what's happening in real-time)
6. **Yesterday's closing summary** (cash difference)

Loads in under 2 seconds on 3G. Owner checks 2-3 times daily from wherever they are. One screen. No complex navigation.

---

## PART 5: WHAT WE DELIBERATELY DON'T INCLUDE (AND WHY)

| Feature | Why NOT |
|---------|---------|
| **WhatsApp-first architecture** | WhatsApp Business API is complex, expensive ($0.05+/msg), requires Meta Business verification. Push notifications from the app + SMS for critical alerts are simpler and reliable in Nepal. |
| **Per-staff sales tracking** | Billing happens at counter by one person. "Who billed" doesn't match workflow. We track by time + end-of-day reconciliation instead. |
| **QR ordering as killer feature** | 80% of cafes are small garden-type where customers shout to order. QR ordering is available as OPTION for larger cafes but NOT the selling point. |
| **Complex ERP accounting** | Hamro SAN went full ERP (AR/AP, journals, ledgers). Owners need "paisa kati aayo, kati gayo, kati bachyo?" — not double-entry bookkeeping. We keep it simple. |
| **Voice ordering kiosk** | Too expensive (hardware), too futuristic for chiya pasals. Maybe in 3-5 years. |
| **Waiter calling hardware** | Physical devices on tables. Chiya pasals don't need them — customers shout. Only relevant for fine dining which is not our target. |
| **Online food ordering/delivery** | Foodmandu, Pathao Food exist. We don't compete with aggregators. If needed later, it's an integration not a core feature. |
| **Self-service kiosk** | Not relevant for our target market. Maybe for chain restaurants later. |

---

## PART 6: PRICING STRATEGY

### 6.1 Pricing Philosophy

1. **Transparent**: All prices public on website. No "Contact Us" barrier.
2. **Free hook**: The microsite (UF-3) is FREE for any cafe. This drives viral adoption.
3. **Value-based**: Each tier is justified by the money it saves/earns the owner.
4. **Nepal-realistic**: Lowest paid tier must be less than 1 day's profit for a chiya pasal.

### 6.2 Tiers

#### FREE — "Mero Cafe" (Digital Presence Only)
- Cafe microsite at cafeos.com.np/cafename
- Digital menu with QR code
- Listed on Cafe Discover platform
- Customer reviews on page
- **Target**: Any cafe. Gets them into our ecosystem. Viral growth tool.

#### BASIC — Rs 499/month (or Rs 4,999/year — save Rs 999)
- Everything in FREE plus:
- Counter Billing (POS) with offline mode
- Daily sales summary report
- Udhari Khata (credit tracking) with customer ledger
- End-of-day cash reconciliation
- Bill history and search
- Fonepay/eSewa payment recording
- 1 user (counter person)
- **Target**: Small chiya pasals. Rs 499/mo = less than 1 day's revenue. The udhari recovery alone pays for it.
- **Pitch**: "Aaja dekhi tapai ko paisa track garnus. Udhari haraudaina. Din ko kamai tha huncha."

#### STANDARD — Rs 999/month (or Rs 9,999/year — save Rs 1,989)
- Everything in BASIC plus:
- Expense tracking with daily profit calculation (Hisab Kitab)
- Supplier ledger
- Monthly P&L report (exportable PDF)
- Ingredient-level inventory with recipe costing (Saman Hisab)
- Low stock alerts
- Menu performance insights (Smart Menu Insights)
- Customer recognition & simple loyalty (Customer Chinha)
- KOT (Kitchen Order Ticket)
- Waste tracking
- 3 users (owner + counter + kitchen)
- **Target**: Medium cafes with 3+ staff. Rs 999/mo = fraction of what they lose monthly to waste, wrong pricing, or untracked expenses.
- **Pitch**: "Nafa kati ho tha paaunus. Kun item bechda faida huncha bujhnus. Customer lai chinnus."

#### PREMIUM — Rs 1,999/month (or Rs 19,999/year — save Rs 3,989)
- Everything in STANDARD plus:
- Multi-branch management
- Table management with floor plan
- QR ordering (customer orders from phone)
- Kitchen Display System (KDS)
- Bulk SMS marketing to customers
- Advanced analytics (hourly patterns, seasonal trends, forecasting)
- IRD-compliant billing with tax export
- Unlimited users
- Priority support (phone + chat)
- **Target**: Modern cafes, restaurants, multi-location owners. Rs 1,999/mo is standard in Nepal restaurant POS market.
- **Pitch**: "Sabai branch ek thau bata manage garnus. Tax compliance, analytics, customer marketing — sabai."

### 6.3 Pricing Comparison with Competitors

| | CafeOS FREE | CafeOS BASIC (Rs 499) | CafeOS STANDARD (Rs 999) | CafeOS PREMIUM (Rs 1,999) |
|---|---|---|---|---|
| vs **TI Restro** (Rs 599) | More features for free | Cheaper + more features (udhari, reconciliation) | More features at same price | Significantly more features |
| vs **Hamro SAN** Silver | Microsite alone beats it | Comparable POS + unique udhari | Beats Silver with profit calc | Matches Gold/Platinum at lower price |
| vs **RestroX** | Free vs trial-only | Comparable core POS | Beats with recipe costing + profit | Comparable with more unique features |
| vs **NRestro** Basic | Free vs paid | More features (udhari, reconciliation) | Significantly more | Significantly more |

### 6.4 Add-on Revenue Streams

- **SMS packs**: Rs 200 for 500 SMS (for udhari reminders, marketing)
- **Custom domain**: Rs 500/year to use cafe's own domain instead of cafeos.com.np subdomain
- **Premium listing on Cafe Discover**: Rs 300/month for featured placement
- **Thermal printer**: Rs 3,000-5,000 (one-time sale, partnership with hardware vendor)
- **Onboarding/setup service**: Rs 2,000 one-time for full menu entry + staff training (done by our team)

---

## PART 7: TECHNICAL ARCHITECTURE

### 7.1 Fork Strategy (Same as v1 — Validated)

Fork the existing AJ Electric / KB Stylish codebase:
- **Frontend**: Next.js 15 App Router — already built, adapt for cafe domain
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage + RLS)
- **Multi-tenancy**: KB Stylish multi-vendor architecture → each cafe = one vendor. Perfect fit.
- **Auth**: Supabase Auth with role-based access (owner, counter_staff, kitchen_staff)
- **Payment recording**: Not payment processing. We record what payment method was used. Fonepay dynamic QR is the only integration needed.

### 7.2 Key Database Schema Additions (Beyond existing)

**New tables needed** (on top of existing products, orders, inventory, user_profiles):

```
cafe_profiles
├── id (uuid, PK)
├── owner_id (uuid, FK → auth.users)
├── name, slug, description, address, phone, hours
├── location (geography point — for map/discovery)
├── logo_url, banner_url, photos (text[])
├── google_maps_url, facebook_url
├── settings (jsonb — KOT on/off, tables on/off, loyalty rules, etc.)
├── subscription_tier (free/basic/standard/premium)
└── created_at, updated_at

udhari_customers
├── id (uuid, PK)
├── cafe_id (uuid, FK)
├── name, phone
├── total_outstanding (numeric — denormalized for fast reads)
├── visit_count, last_visit, usual_order (jsonb)
└── created_at

udhari_ledger
├── id (uuid, PK)
├── cafe_id, customer_id (FKs)
├── bill_id (FK → orders, nullable for manual adjustments)
├── type (enum: 'credit' | 'payment' | 'writeoff')
├── amount (numeric)
├── note (text)
└── created_at

daily_expenses
├── id (uuid, PK)
├── cafe_id (uuid, FK)
├── category (enum: 'dairy','vegetable','grocery','cigarette','fuel','salary','rent','utility','other')
├── amount (numeric)
├── supplier_name (text, nullable)
├── is_paid (boolean)
└── date, created_at

fixed_costs
├── id (uuid, PK)
├── cafe_id (uuid, FK)
├── type (text — 'rent','salary','electricity','internet','other')
├── amount (numeric)
├── frequency (enum: 'monthly','yearly')
└── created_at, updated_at

ingredients
├── id (uuid, PK)
├── cafe_id (uuid, FK)
├── name, unit (enum: 'g','kg','ml','L','pcs')
├── current_stock (numeric)
├── low_stock_threshold (numeric)
├── cost_per_unit (numeric)
└── updated_at

recipes (links menu items to ingredients)
├── id (uuid, PK)
├── menu_item_id (FK → products)
├── ingredient_id (FK → ingredients)
├── quantity_per_unit (numeric — e.g., 10g tea per 1 cup chiya)
└── cafe_id (FK)

daily_closings
├── id (uuid, PK)
├── cafe_id (uuid, FK)
├── date
├── expected_cash (numeric — calculated from bills)
├── actual_cash (numeric — entered by staff)
├── difference (numeric — calculated)
├── digital_total, udhari_total (numeric)
├── total_revenue, total_orders (numeric)
├── note (text)
└── closed_by (FK → auth.users), created_at

customer_reviews
├── id (uuid, PK)
├── cafe_id (uuid, FK)
├── reviewer_name (text)
├── rating (int, 1-5)
├── comment (text)
└── created_at
```

### 7.3 Key RPC Functions Needed

```
-- Billing
create_bill(cafe_id, items[], payment_method, customer_id?, discount?)
void_bill(bill_id, reason)

-- Udhari
add_udhari_credit(cafe_id, customer_id, bill_id, amount)
record_udhari_payment(cafe_id, customer_id, amount, note?)
get_udhari_dashboard(cafe_id) → totals, aging, customer list

-- Expenses & Profit
add_expense(cafe_id, category, amount, supplier?, is_paid?)
get_daily_profit(cafe_id, date) → revenue, expenses, fixed_share, net
get_monthly_pnl(cafe_id, year, month) → full P&L breakdown

-- Inventory
update_ingredient_stock(cafe_id, ingredient_id, new_quantity)
auto_deduct_ingredients(bill_id) → deducts based on recipes
get_stock_alerts(cafe_id) → low stock items with days remaining

-- Closing
submit_daily_closing(cafe_id, actual_cash, note?)
get_closing_history(cafe_id, date_range) → list with trends

-- Analytics
get_menu_performance(cafe_id, date_range) → stars/workhorses/puzzles/dogs
get_hourly_pattern(cafe_id, date_range) → heatmap data
get_customer_insights(cafe_id) → regulars, frequency, retention

-- Discovery
get_cafes_by_location(lat, lng, radius, type_filter?)
get_cafe_public_profile(slug) → menu, reviews, info
submit_review(cafe_id, name, rating, comment)
```

### 7.4 Frontend Pages Needed

**Public (no auth)**:
- `cafeos.com.np/[slug]` — Cafe microsite (SSG/ISR)
- `cafeos.com.np/explore` — Discovery platform
- `cafeos.com.np/` — Landing page (marketing)

**Counter Staff (auth: counter_staff or owner)**:
- `/billing` — POS billing screen (the main screen, optimized for speed)
- `/kot` — Kitchen order ticket view
- `/closing` — End-of-day closing form

**Owner (auth: owner)**:
- `/dashboard` — Cafe Control (UF-10) — the one-screen owner view
- `/reports` — Full reports (sales, items, hourly, categories)
- `/menu` — Menu management (add/edit items, categories, photos)
- `/inventory` — Stock levels, ingredients, recipes
- `/expenses` — Daily expense entry, fixed costs, supplier ledger
- `/udhari` — Udhari dashboard, customer ledger, reminders
- `/customers` — Customer profiles, loyalty, SMS
- `/settings` — Cafe profile, staff management, subscription, printer setup
- `/tables` — Table management (optional, if enabled)

**Kitchen Staff (auth: kitchen_staff)**:
- `/kitchen` — KDS view (order queue, mark ready)

### 7.5 Offline-First PWA Strategy

Critical for Nepal's unreliable internet:
- Service worker caches billing interface, menu data, recent customers
- Bills created offline are stored in IndexedDB
- When connection returns, sync queue pushes to Supabase
- Conflict resolution: server timestamp wins, but offline bills get unique local IDs
- KOT: if offline, prints locally only (no cloud sync needed for kitchen)
- Reports require connection (acceptable — owner checks when they have WiFi)

### 7.6 SMS Integration

For udhari reminders and marketing:
- Integrate with Nepal bulk SMS provider (Sparrow SMS, Aakash SMS, or similar)
- Template-based: predefined Nepali templates with variable substitution
- Rate: ~Rs 0.30-0.50 per SMS
- Owner buys SMS packs through CafeOS (we resell at margin)
- Delivery reports tracked

---

## PART 8: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-3)
**Goal**: Basic billing + daily reports working for first 3 cafes

- Fork codebase, set up new Supabase project
- Database migrations: cafe_profiles, adapt existing products/orders tables
- Counter billing POS (BF-1): Nepali UI, tap-to-bill, payment modes
- Basic menu management (BF-3): add items with categories and prices
- Daily sales summary report (BF-5 basic)
- User roles: owner + counter_staff (BF-12)
- PWA setup with offline billing
- **Deploy to first 3 cafes for testing**

### Phase 2: Money Features (Weeks 4-6)
**Goal**: Udhari + expenses + closing — the core "money management" value

- Udhari Khata (UF-1): full credit tracking, customer ledger, SMS reminders
- Expense tracking (UF-2): quick entry, categories, supplier ledger
- Fixed costs + daily profit calculation (UF-2)
- Monthly P&L report with PDF export (UF-2)
- End-of-day cash reconciliation (UF-8)
- Owner remote dashboard — Cafe Control (UF-10)

### Phase 3: Digital Presence (Weeks 7-8)
**Goal**: Every cafe gets a microsite + discovery platform live

- Cafe microsite generation (UF-3): cafeos.com.np/[slug]
- QR code generation + printable PDF
- Cafe Discover platform (UF-5): cafeos.com.np/explore
- Customer reviews on cafe page
- SEO optimization for all public pages
- Google Business Profile setup guide (UF-3)

### Phase 4: Smart Features (Weeks 9-11)
**Goal**: Ingredient tracking + menu insights + customer recognition

- Ingredient inventory + recipes (UF-4): setup, auto-deduction, alerts
- Food cost per item calculation (UF-4)
- Menu performance matrix — Stars/Workhorses/Puzzles/Dogs (UF-9)
- Customer Chinha (UF-6): phone-based recognition, usual order, visit tracking
- Simple loyalty rules (UF-6)

### Phase 5: Operations Features (Weeks 12-14)
**Goal**: KOT, KDS, table management, QR ordering for larger cafes

- KOT system (BF-2): printer + screen support
- Kitchen Display System (BF-11)
- Table management with floor plan (BF-6)
- QR ordering mode for larger cafes (BF-7 extended)
- Waste tracking (BF-13)
- Fonepay dynamic QR integration (BF-9)

### Phase 6: Scale & Compliance (Weeks 15-18)
**Goal**: Multi-branch, IRD compliance, advanced analytics, SMS marketing

- Multi-branch management (BF-10)
- IRD-compliant billing + tax export (UF-7)
- Advanced analytics: hourly patterns, seasonal trends, forecasting (BF-5 extended)
- Bulk SMS marketing campaigns (UF-6 extended)
- Subscription management + payment collection (Khalti/eSewa for SaaS billing)
- Landing page + marketing site

---

## PART 9: GO-TO-MARKET FOR FIRST 3 CAFES

### 9.1 Launch Strategy

1. **Start FREE**: Give the first 3 cafes CafeOS STANDARD for free for 3 months.
2. **In-person onboarding**: Visit each cafe physically. Set up menu. Train counter person. Be there for first 2-3 days.
3. **Collect feedback daily**: What works, what doesn't, what's confusing, what's missing.
4. **Iterate fast**: Fix issues same-day if possible.
5. **After 3 months**: Convert to paid (at discounted "founding customer" rate) or keep as case study.

### 9.2 What to Prove with First 3

- [ ] Counter person can bill faster than paper within 1 week of training
- [ ] Owner can see daily revenue and profit from phone
- [ ] Udhari tracking recovers measurably more money than paper khata
- [ ] End-of-day reconciliation catches discrepancies
- [ ] Owner voluntarily checks the app daily (engagement proof)
- [ ] At least one owner says "yo bhaye pugcha" (this is enough, I'm happy)

### 9.3 Scaling After Proof

- Each happy cafe tells 3-5 other owners (word of mouth is #1 in Nepal)
- Cafe microsites are shared on Facebook → others see and ask "how do I get this?"
- Cafe Discover platform grows → customers discover cafes → owners see value → join
- Targeted Facebook ads to cafe owners in Kathmandu Valley
- Partner with cafe supply wholesalers (they see all cafe owners regularly)

---

## PART 10: FEATURE SUMMARY TABLE

| # | Feature | Type | Tier | Competitors Have It? |
|---|---------|------|------|---------------------|
| BF-1 | Counter Billing (POS) | Baseline | BASIC+ | All competitors |
| BF-2 | Kitchen Order Ticket (KOT) | Baseline | STANDARD+ | Most competitors |
| BF-3 | Menu Management | Baseline | BASIC+ | All competitors |
| BF-4 | Inventory & Stock | Baseline | STANDARD+ | Some competitors |
| BF-5 | Reports & Analytics | Baseline | BASIC+ | All competitors |
| BF-6 | Table Management | Baseline | PREMIUM | Some competitors |
| BF-7 | Digital QR Menu | Baseline | FREE+ | Some competitors |
| BF-8 | Multi-Device Support | Baseline | ALL | Most competitors |
| BF-9 | Fonepay/eSewa/Khalti | Baseline | BASIC+ | NRestro, RestroX |
| BF-10 | Multi-Branch | Baseline | PREMIUM | NRestro, RestroX, Aaryatm |
| BF-11 | Kitchen Display (KDS) | Baseline | PREMIUM | RestroX, Petpooja |
| BF-12 | User Management & Roles | Baseline | ALL | Most competitors |
| BF-13 | Waste Tracking | Baseline | STANDARD+ | RestroX only |
| **UF-1** | **Udhari Khata (Credit Tracking)** | **UNIQUE** | **BASIC+** | **NOBODY** |
| **UF-2** | **Hisab Kitab (Profit Calculator)** | **UNIQUE** | **STANDARD+** | **NOBODY** |
| **UF-3** | **Mero Cafe (Auto Microsite)** | **UNIQUE** | **FREE+** | **NOBODY in Nepal** |
| **UF-4** | **Saman Hisab (Recipe Costing)** | **UNIQUE** | **STANDARD+** | **NOBODY simple** |
| **UF-5** | **Cafe Discover (Platform)** | **UNIQUE** | **FREE+** | **NOBODY** |
| **UF-6** | **Customer Chinha (Recognition)** | **UNIQUE** | **STANDARD+** | **NOBODY in Nepal** |
| **UF-7** | **IRD Sajilo (Tax Compliance)** | **UNIQUE** | **PREMIUM** | **Only RestroX partial** |
| **UF-8** | **Din Ko Hisab (Cash Reconciliation)** | **UNIQUE** | **BASIC+** | **NOBODY** |
| **UF-9** | **Smart Menu Insights** | **UNIQUE** | **STANDARD+** | **NOBODY** |
| **UF-10** | **Cafe Control (Owner Dashboard)** | **UNIQUE** | **BASIC+** | **NOBODY purpose-built** |

**Total: 13 baseline features (best of ALL competitors) + 10 unique features (NOBODY has)**

---

## PART 11: SUCCESS METRICS

### Product Metrics (First 6 months)
- 3 cafes onboarded and actively using daily by Month 1
- 15 cafes by Month 3 (10 paid)
- 50 cafes by Month 6 (35 paid)
- Average daily active usage > 90% (counter person uses it every day)
- Udhari recovery rate improvement: measurable 15-20% improvement over paper

### Business Metrics
- MRR target Month 6: 35 cafes × Rs 750 avg = Rs 26,250/month
- Free tier cafes: 50+ (building Cafe Discover network)
- Customer acquisition cost: < Rs 1,000 (mostly word of mouth + free tier viral)
- Churn: < 5% monthly (if we solve real problems, they don't leave)

### Technical Metrics
- Billing speed: < 8 seconds for a 3-item bill
- Offline capability: 100% billing works without internet
- Page load: < 2 seconds on 3G for any screen
- Uptime: 99.5%+ (Supabase handles infrastructure)

---

*End of CafeOS Deep Blueprint v2*
