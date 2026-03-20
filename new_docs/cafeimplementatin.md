# CafeOS: Multi-Tenant Cafe Management SaaS - Production Blueprint

Fork the existing KB Stylish/AJ Electric codebase to build a multi-tenant cafe management SaaS for Nepal, leveraging 80%+ of existing infrastructure while adding cafe-specific killer features that outclass every competitor in the market.

---

## PART 1: STRATEGIC DECISION — BUILD vs FORK

### Verdict: FORK & ADAPT (Same strategy as AJ Electric, proven to work)

| Component | KB Stylish / AJ Electric Has | Reuse for CafeOS |
|-----------|------------------------------|-------------------|
| **Authentication** | JWT + role-based access + RLS | **100%** — Map vendor→cafe_owner, admin→platform_admin |
| **Products System** | Products, variants, attributes, images | **95%** — Products→Menu Items, variants→sizes/add-ons |
| **Inventory System** | Stock tracking, movements, multi-location, audit trail | **90%** — Ingredient-level inventory, recipe costing |
| **Order System** | Cart→Checkout→Payment→Fulfillment pipeline | **85%** — Add table/QR ordering, KOT dispatch |
| **Payment Gateway** | Khalti + NPX integration (Nepal-specific) | **100%** — Already working |
| **Dashboard/Analytics** | Governance engine, vendor+admin dashboards, metrics | **90%** — Repurpose for cafe owner + platform admin |
| **Edge Functions** | 24 deployed (cart, order, payment, review, metrics) | **80%** — Add QR-order, KOT functions |
| **Review/Trust Engine** | Reviews, votes, ratings, replies | **70%** — Customer feedback on menu items |
| **Email/Notifications** | send-email, workers, job queue | **100%** — Order confirmations, alerts |
| **Support System** | Support tickets + messages | **100%** — Customer/owner support |
| **UI Component Library** | 175+ components (shadcn/ui, Tailwind, Radix) | **90%** — Rebrand for cafe aesthetic |
| **Multi-vendor isolation** | vendor_id on products, RLS per vendor | **100% CRITICAL** — This IS multi-tenant isolation |

### Why This Is a 10x Time Saver
- AJ Electric took **~7 days** from fork to production-ready
- CafeOS has MORE reuse potential because **multi-vendor = multi-tenant** (unlike AJ Electric which had to REMOVE multi-vendor)
- **Estimated: 10-14 days** to MVP with the fork approach vs 3-4 months from scratch
- Auth, RLS, payment, cart, order pipeline = **4-5 months of testing already done in KB Stylish**

### The Key Architectural Mapping

```
KB Stylish Concept    →    CafeOS Concept
─────────────────────────────────────────
Vendor                →    Cafe Owner
Vendor Dashboard      →    Cafe Dashboard
Admin                 →    Platform Admin (you)
Customer              →    Dine-in Customer / Online Customer
Product               →    Menu Item
Product Variant       →    Size / Customization
Product Attribute     →    Dietary info, spice level, etc.
Category              →    Menu Category (Drinks, Snacks, Meals)
Inventory             →    Ingredient Stock
Inventory Location    →    Kitchen / Storage / Branch
Order                 →    Dine-in Order / Takeaway / Delivery
vendor_id isolation   →    cafe_id tenant isolation (RLS)
Vendor Application    →    Cafe Onboarding Flow
Vendor Store Page     →    Cafe's QR Menu / Microsite
```

---

## PART 2: NEPAL MARKET REALITY (THE REAL BUYING TRIGGERS)

### Ground Truth for Small Chiya Pasals and Cafes

1. **Counter-first operations dominate**
   - Staff shout orders to kitchen, write on paper, or memorize.
   - Owner pain is not "I need QR". It is "I am losing cash, stock, and control."

2. **Payment is usually at end-of-visit**
   - Cash is still dominant in many outlets.
   - eSewa/Khalti/FonePay are increasingly common, but used as settlement rails, not always in-flow ordering rails.

3. **Owner's real fear = invisible leakage**
   - Under-ringing, missed items, untracked complimentary items, and shift mismatch.
   - Ingredient leakage and waste silently kill margins.

4. **Tool complexity kills adoption**
   - If billing takes more than a few taps, staff bypass system.
   - If reports are not action-oriented, owners ignore them.

### Competitive Gap (Opportunity)

Most solutions in Nepal market sell "features" (QR menu, basic POS, generic reports).
The defensible wedge is **profit-control workflow**:

1. **Shift close with variance accountability** (expected vs actual cash/digital)
2. **Order-to-kitchen traceability for counter orders** (no missed tea/snack)
3. **Ingredient-to-sale linkage** (what sold vs what should be consumed)
4. **Udhaar/customer credit with follow-up discipline**
5. **Simple, local-language ready UX for low-tech staff**

---

## PART 3: CAFEOS FEATURE MATRIX (COUNTER-FIRST)

### Tier 1: MVP (Week 1-2) - Reuse + Rename + Launch Fast

These are already present in codebase and can ship quickly:

| Feature | Source in Codebase | Why It Matters for Nepal Cafes |
|---------|-------------------|---------------------------------|
| **Quick Billing/POS** | `vendor/quick-sale`, `QuickSaleClient` | Fast counter billing for cash and end-of-visit settlement |
| **Payment Split Visibility** | local sales summary | Owner sees cash vs digital mix daily |
| **Inventory with movement log** | inventory + `inventory_movements` | Protects against stock leakage and silent shrinkage |
| **Local sales recording + void flow** | `record_local_sale`, `void_local_sale` | Reliable walk-in transaction history |
| **Low stock alerts** | dashboard + inventory overview | Prevents stockout of high runners (milk/tea leaves/gas) |
| **Role-gated dashboard** | existing auth + RLS | Owner/admin control from day one |

### Tier 2: Nepal Differentiators (Week 2-3)

| Feature | Description | ROI Signal for Owner |
|---------|-------------|----------------------|
| **Shift Close & Cash Reconciliation** | Opening float, expected vs counted cash, variance reason, approver | Stops daily cash leakage and blame games |
| **Counter-to-Kitchen Ticket Board** | Every billed item becomes a kitchen token; ready/served states | Reduces missed orders and re-fire cost |
| **Udhaar / Credit Ledger** | Customer phone-based ledger, due reminders, settlement history | Recovers receivables and avoids notebook chaos |
| **Waste Reason Tracker** | Daily waste by ingredient + reason (spoilage/overprep/return) | Converts waste into action, not guesswork |
| **Top-20 Control Dashboard** | 20 SKUs driving most revenue + margin/waste risk flags | Focuses owner attention where money actually moves |

### Tier 3: Profit Engine (Week 3-5)

| Feature | Description | Why It Wins |
|---------|-------------|-------------|
| **Recipe Yield Variance** | Expected ingredient use vs actual movement variance | Detects pilferage and process loss |
| **Prep Planner (Time-slot)** | Suggest prep quantity by daypart using historical sell-through | Lowers spoilage while avoiding stockout |
| **Staff Accountability Views** | Per-shift voids, discounts, variance trends | Reduces manipulation and improves discipline |
| **Simple Loyalty (Phone-based)** | Visit count/reward logic without mandatory app install | Practical retention for local repeat customers |
| **Digital Payment Proof Capture** | eSewa/Khalti/FonePay ref capture with optional screenshot | Faster dispute resolution at settlement time |

### Tier 4: Optional Experience Layer (Month 2+)

| Feature | Description |
|---------|-------------|
| **QR Menu + Optional Table Ordering** | Useful for premium/urban cafes, optional for small pasals |
| **Kitchen Display System (advanced)** | Station-based routing and prep timers |
| **Delivery/aggregator integrations** | Pathao/Foodmandu connectors where relevant |
| **Multi-branch controls** | Chain-level dashboard and branch benchmarking |
| **VAT/PAN compliance pack** | Formalization tools for growing outlets |

---

## PART 4: TECHNICAL ARCHITECTURE

### Tech Stack (Inherited + Enhanced)

```
Frontend:    Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui
Backend:     Supabase (PostgreSQL + Edge Functions + Auth + Realtime + Storage)
State:       Zustand stores
Payments:    Khalti + NPX (existing) + eSewa (add)
Hosting:     Vercel (frontend) + Supabase Cloud (backend)
Monitoring:  Sentry (already integrated)
Cache:       Upstash Redis (already integrated)
Testing:     Playwright E2E + Jest unit
```

### Multi-Tenant Database Architecture

The existing `vendor_id` pattern on all tables IS the multi-tenant isolation. Each cafe owner gets their own `vendor_id` (renamed conceptually to `cafe_id` in the UI, but same column in DB).

```
Key tenant-isolated tables (already exist):
├── products (menu items)        → WHERE vendor_id = auth.uid()
├── product_variants             → via product.vendor_id
├── inventory                    → WHERE vendor_id = auth.uid()
├── inventory_movements          → via inventory.vendor_id
├── orders                       → WHERE vendor_id = auth.uid()
├── order_items                  → via order.vendor_id
├── metrics.vendor_daily         → WHERE vendor_id = auth.uid()
└── metrics.vendor_realtime_cache → WHERE vendor_id = auth.uid()
```

### Existing Local-Store Assets to Keep (High Reuse)

```sql
-- Already aligned with small-cafe operations
local_sales
local_sale_items
inventory
inventory_movements
```

### New Tables Needed for Counter-Control Features

```sql
-- Shift and cash control
shift_sessions (id, cafe_id, opened_by, opened_at, closed_by, closed_at, opening_float, expected_cash, counted_cash, cash_variance, notes)
shift_payment_breakdown (id, shift_id, payment_method, expected_amount, counted_amount, variance)

-- Udhaar (customer credit)
customer_credit_accounts (id, cafe_id, customer_phone, customer_name, credit_limit, is_active)
customer_credit_ledger (id, account_id, entry_type, amount, reference_sale_id, note, created_at, created_by)

-- Kitchen communication for counter orders
kitchen_tickets (id, cafe_id, local_sale_id, token_number, status, priority, created_at, ready_at, served_at)
kitchen_ticket_items (id, kitchen_ticket_id, item_name, qty, notes)

-- Margin control
recipe_ingredients (id, cafe_id, menu_variant_id, ingredient_variant_id, qty_per_unit)
waste_logs (id, cafe_id, ingredient_variant_id, quantity, reason, shift_id, logged_at, logged_by)
recipe_variance_daily (id, cafe_id, menu_variant_id, expected_qty, actual_qty, variance_pct, date)
```

### New Edge Functions Needed

```
Operations:
├── shift-close-manager/   → Expected vs counted reconciliation, variance lock
├── credit-ledger-manager/ → Udhaar posting, settlement, reminders
├── kitchen-ticket-manager/ → Token generation and status transitions
├── recipe-variance-job/   → Daily expected-vs-actual ingredient checks
└── waste-tracker/         → Waste logging and reporting

Notifications:
├── payment-reminder/      → Udhaar due reminders
└── shift-alerts/          → Large variance or abnormal void alerts
```

### Core Operational Flow (The Killer Feature)

```
Counter Staff               System                      Kitchen
─────────────               ──────                      ───────
Take order (voice/table)
       ──────────→ Ring items in Quick POS
                   Validate stock + pricing
                   Record sale (cash/digital/credit)
                   Deduct inventory
                   Generate token
                   Push kitchen ticket  ─────────────→ Queue shows token and items

                                                   Mark ready
                   ←──────────────────────────────── status update
       ←────────── Ready signal at counter

At shift close
       ──────────→ System computes expected cash/digital totals
                   Staff enters counted amounts
                   Variance reason required if mismatch
                   Owner reviews and locks shift
```

---

## PART 5: PRICING STRATEGY (ROI-ANCHORED)

### Competitor Pricing Reference (Nepal Market)
- **TI Restro**: Rs 599/mo (basic), Rs 999/mo (standard)
- **Hamro SAN**: Tiered, likely Rs 1,000-3,000/mo range
- **Aaryatm**: Custom/enterprise pricing

### CafeOS Pricing Model: Simple, Value-Based

| Plan | Price | Target | Includes |
|------|-------|--------|----------|
| **Starter** | Rs 599/mo | Chiya pasals, tiny cafes | Quick billing, cash/digital tracking, basic inventory, daily summary |
| **Control** | Rs 1,299/mo | Small cafes, single branch | Starter + shift close, kitchen tokens, udhaar ledger, low stock controls |
| **Profit+** | Rs 2,499/mo | Busy cafes/restaurants | Control + waste analytics, recipe variance, staff controls, loyalty |
| **Scale** | Rs 4,999/mo | Multi-branch operators | Profit+ + multi-branch rollup, central controls, premium support |

### Why This Pricing Wins in Nepal
1. **Matches owner math**: one prevented cash/stock leak can pay monthly fee.
2. **No overwhelming enterprise jump**: clear step-up by operational maturity.
3. **Sell outcomes, not modules**: "variance down", "waste down", "udhaar recovered".
4. **Optional QR add-on**: only outlets needing it pay for it.

### Revenue Projections (Conservative)
- **Year 1 Target**: 50 paying cafes (mix across all tiers)
  - 25 Starter × Rs 599 = Rs 14,975/mo
  - 15 Control × Rs 1,299 = Rs 19,485/mo
  - 8 Profit+ × Rs 2,499 = Rs 19,992/mo
  - 2 Scale × Rs 4,999 = Rs 9,998/mo
  - **Monthly Revenue: Rs 64,450 (~$480 USD)**
  - **Annual Revenue: Rs 7,73,400 (~$5,760 USD)**
- **Year 2 Target**: 200 paying cafes → ~Rs 2,60,000/mo (mixed-tier blend)
- **Break-even**: ~30 paying cafes (covers Supabase Pro + Vercel + domain costs)

### Upsell Opportunities
- **Per-transaction fee**: 0.5% on online orders (on top of payment gateway fee)
- **SMS/WhatsApp credits**: Rs 0.5/notification after free quota
- **Custom domain**: Rs 500/mo for `menu.yourcafe.com` instead of `cafeos.com.np/slug`
- **Hardware bundle**: Thermal printer + tablet package (one-time Rs 15,000-25,000)

---

## PART 6: COMPETITIVE DIFFERENTIATION - WHY CAFEOS WINS

### 1. "Control Tower" for Counter Business
CafeOS is positioned as **daily leakage control**, not "just POS".

### 2. Shift Accountability Built-In
Every close has expected-vs-counted reconciliation with reasons and owner approval.

### 3. Voice-to-Ticket Discipline
Counter orders become kitchen tokens automatically, reducing missed and late items.

### 4. Udhaar Without Notebook Chaos
Phone-number based credit ledger + reminders + settlement history.

### 5. Margin Visibility for Top Sellers
Track items that matter most, with waste and recipe variance tied to sales.

### 6. Low-Tech Friendly UX
Few taps, large touch targets, quick workflow that staff actually uses.

### 7. QR as Optional Upsell, Not Core Dependency
Keeps product relevant for both small pasals and premium cafes.

---

## PART 7: IMPLEMENTATION ROADMAP

### Phase 1: Fork & Foundation (Days 1-3)
- [ ] Clone AJ Electric repository → new "cafeos" project
- [ ] Create new Supabase project (clone schema approach)
- [ ] Rebrand: cafe color scheme (warm earth tones — espresso brown, cream, sage green)
- [ ] Rename vendor→cafe_owner throughout codebase
- [ ] Map products→menu_items in UI terminology
- [ ] Map categories→menu sections (Beverages, Snacks, Meals, Desserts)
- [ ] Strip electrical-specific attributes, add cafe attributes (dietary, spice, allergens)
- [ ] Update homepage to CafeOS SaaS landing page

### Phase 2: Core Control Features (Days 4-7)
- [ ] Shift open/close workflow with reconciliation
- [ ] Kitchen token board linked to counter billing
- [ ] Udhaar ledger and settlement flow
- [ ] Waste logging UX and reason taxonomy
- [ ] Control dashboard (variance + void + waste highlights)

### Phase 3: Profit Differentiators (Days 8-12)
- [ ] Recipe linkage and expected usage model
- [ ] Daily recipe variance engine
- [ ] Staff accountability views
- [ ] Simple loyalty (phone based)
- [ ] Payment reference verification tooling

### Phase 4: Polish & Launch (Days 13-16)
- [ ] SaaS landing page with pricing
- [ ] Self-serve onboarding flow (sign up → add menu → start counter billing, optional QR setup)
- [ ] Billing/subscription management (Khalti recurring or manual)
- [ ] Documentation & help center
- [ ] Production deployment (Vercel + Supabase)
- [ ] Seed with 2-3 demo cafes
- [ ] E2E testing of critical flows

### Phase 5: Go-to-Market (Week 4+)
- [ ] Onboard 5 pilot outlets (mix: 2 chiya pasals, 2 small cafes, 1 busy cafe)
- [ ] Baseline and prove metrics: variance reduction, waste reduction, udhaar recovery
- [ ] Publish ROI case study in Nepali + English
- [ ] Referral model: "one owner introduces one owner" incentive

---

## PART 8: WHAT TO KEEP / MODIFY / REMOVE / ADD

### From the AJ Electric Codebase

| Category | Keep | Modify | Remove | Add New |
|----------|------|--------|--------|---------|
| DB Tables | 25 | 8 | ~5 (electrical-specific) | ~8 (cafe-specific) |
| DB Functions | 40+ | 15 | ~5 | ~10 |
| Edge Functions | 15 | 6 | 2 | ~5 |
| Frontend Pages | 60+ | 25 | ~10 | ~12 |
| Components | 150+ | 30 | ~10 | ~15 |

### Key Modifications
- `vendor/dashboard` → `cafe/dashboard` (rebrand + add cafe-specific widgets)
- `vendor/products` → `cafe/menu` (rename, add food-specific fields)
- `vendor/inventory` → `cafe/inventory` (add ingredient tracking)
- `vendor/orders` → `cafe/orders` (add table#, order type, KOT status)
- `admin/*` → Platform admin for managing all cafes
- Homepage → SaaS landing page
- Product detail → Menu item with dietary info, allergens, customization

### Key Removals
- Electrical-specific attributes (voltage, wattage, wire gauge)
- B2B features (bulk order CTA, contractor focus)
- Single-vendor specific simplifications (re-enable multi-vendor = multi-cafe)
- Industrial aesthetic components (ImmersiveHero, BrandTrustStrip for electrical)

### Key Additions
- `/cafe/dashboard/shifts` — shift open/close and reconciliation
- `/cafe/dashboard/kitchen-board` — counter-to-kitchen token flow
- `/cafe/dashboard/udhaar` — customer credit ledger and settlement
- `/cafe/dashboard/waste` — waste logging + reasons
- `/cafe/dashboard/recipes` — recipe usage and variance
- `/cafe/dashboard/controls` — owner control center (voids, variance, leakage)
- `/cafe/[slug]` — optional customer-facing digital menu
- `/cafe/[slug]/order` — optional QR ordering flow
- `/platform/pricing` — SaaS pricing page
- `/platform/onboard` — self-serve cafe registration

---

## PART 9: DESIGN SYSTEM

### Color Palette — Warm Cafe Aesthetic

```css
/* Primary — Rich Espresso */
--cafe-espresso: #3C2415;
--cafe-espresso-light: #5C3D2E;
--cafe-latte: #C4A882;

/* Secondary — Fresh Sage */  
--cafe-sage: #87A878;
--cafe-mint: #B8D4A8;

/* Neutral — Warm Cream */
--cafe-cream: #FFF8F0;
--cafe-warm-gray: #F5F0EB;
--cafe-charcoal: #2D2D2D;

/* Accent */
--cafe-terracotta: #C4704B;
--cafe-success: #22C55E;
--cafe-warning: #FBBF24;
--cafe-danger: #EF4444;
```

### Typography
- **Headlines**: Warm serif or rounded sans (Outfit, Plus Jakarta Sans)
- **Body**: Clean, highly readable (Inter)
- **Menu Items**: Appetizing, slightly playful
- **Prices**: Clear, prominent

---

## PART 10: RISK ANALYSIS

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Market too small in Nepal | HIGH | LOW | Low-entry Starter pricing captures volume; expand regionally later |
| Competitor copies features | MEDIUM | HIGH | Speed to market + loyalty stickiness + continuous innovation |
| Cafe owners resist tech | HIGH | MEDIUM | Assisted onboarding, Nepali-first UX, and quick staff training cards |
| Payment gateway issues | MEDIUM | LOW | Already battle-tested in KB Stylish + AJ Electric |
| Supabase costs at scale | MEDIUM | LOW | Efficient queries, Redis caching already in place |
| Staff bypasses system during rush | HIGH | MEDIUM | 3-tap billing flow, offline-safe queue, quick actions |
| Owner distrust in digital totals | HIGH | MEDIUM | shift reconciliation + printable close summary |
| QR adoption remains low | MEDIUM | HIGH | keep QR as optional module, not core promise |

---

## PART 11: SUCCESS METRICS

### Product Metrics
- **Time to first order**: < 30 min from signup
- **Billing screen response time**: < 1 second for core actions
- **Order-to-kitchen latency**: < 3 seconds (via Realtime)
- **Dashboard load**: < 2 seconds
- **Uptime**: 99.9%

### Business Metrics (Year 1)
- **Cafes onboarded**: 200+ (trial + paid)
- **Paying customers**: 50+
- **MRR**: Rs 60,000+
- **Churn rate**: < 5%/month
- **NPS**: > 50

---

## SUMMARY: THE BOTTOM LINE

**CafeOS is not a new product built from scratch — it's a battle-tested e-commerce platform (5 months of KB Stylish + AJ Electric testing) redeployed as a multi-tenant cafe management SaaS.**

The existing codebase gives us:
- **Auth + RLS + multi-tenant isolation** → 0 effort
- **Product/Variant/Inventory system** → 90% reuse  
- **Cart→Order→Payment pipeline** → 85% reuse
- **Analytics/Dashboard engine** → 90% reuse
- **150+ UI components** → 90% reuse

What we ADD makes us hard to replace in Nepal:
- **Shift reconciliation and variance control**
- **Counter-to-kitchen ticket discipline**
- **Udhaar ledger with collection workflow**
- **Recipe variance + waste tracking**
- **Low-tech friendly, counter-first UX**
- **Optional QR for premium outlets (not mandatory)**

**Estimated time to MVP: 14-16 days.** From scratch would be 3-4 months.

**Charge Rs 599-4,999/month** based on control depth and branch complexity. Sell measurable ROI, not feature checklists.

Fork it. Ship it. Own the Nepal cafe tech market.
