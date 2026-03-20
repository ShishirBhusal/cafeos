# CafeOS Production Implementation Plan
## Following UNIVERSAL_AI_EXCELLENCE_PROTOCOL v2.0

**Date**: February 15, 2026  
**Status**: PRODUCTION-READY IMPLEMENTATION PLAN  
**Protocol**: 10-Phase Excellence Protocol Applied  
**Version**: 1.0

---

# PHASE 1: CODEBASE IMMERSION — KB STYLISH SYSTEMS MAP

## 1.1 Architecture Analysis Complete

### Core Systems Available for Reuse (100+ DB Functions Analyzed)

| System | KB Stylish Implementation | CafeOS Mapping | Reuse % |
|--------|--------------------------|----------------|---------|
| **Authentication** | JWT + role-based + RLS + `user_has_role()` | Same - one user can have multiple roles (owner+kitchen+counter) | **100%** |
| **Multi-Tenant Isolation** | `vendor_id` on all tables + RLS policies | `cafe_id` = `vendor_id` (conceptual rename only) | **100%** |
| **Products/Menu** | products, variants, attributes, images, categories | Menu items with sizes/customizations | **95%** |
| **Inventory** | Stock tracking, movements, audit trail | Ingredient-level inventory | **90%** |
| **Orders** | Cart → Checkout → Payment → Fulfillment pipeline | Add order_type, table_number, kitchen_status | **85%** |
| **Payments** | Khalti + NPX integration | Add eSewa, Fonepay recording | **100%** |
| **Bookings** | Reservations, scheduling, status tracking | Pre-order scheduling (order before arriving) | **80%** |
| **Metrics Engine** | vendor_daily, platform_daily, realtime cache | Cafe daily metrics, owner dashboard | **95%** |
| **Reviews/Trust** | Reviews, votes, ratings | Customer feedback on menu items | **70%** |
| **Support System** | Tickets, messages, categories | Owner/platform support | **100%** |
| **Edge Functions** | 23 deployed (cart, order, payment, review, metrics) | Adapt + add kitchen-ticket, shift-close | **80%** |

### Role System Analysis (CRITICAL FOR CAFEOS)

**Existing KB Stylish Roles** (in `roles` table):
```
admin        → Platform admin (DTI)
vendor       → Cafe owner
customer     → End user
stylist      → Service provider (repurpose → kitchen)
support      → Customer support
cafe_manager → Added in previous session
kitchen      → Added in previous session  
counter      → Added in previous session
waiter       → Added in previous session
```

**Key Insight**: KB Stylish already supports ONE USER having MULTIPLE ROLES via `user_roles` junction table. A cafe owner can be assigned `[vendor, kitchen, counter]` and access all respective dashboards.

### Database Schema Already Available

```
Tables ready for direct reuse:
├── auth.users                    → User accounts
├── user_profiles                 → User details, role_version
├── user_roles                    → Junction: user ↔ role (multiple roles per user)
├── roles                         → Role definitions
├── vendor_profiles               → cafe_profiles (rename conceptually)
├── products                      → menu_items
├── product_variants              → sizes/customizations  
├── product_images                → menu item photos
├── categories                    → menu categories
├── inventory                     → ingredient stock
├── inventory_movements           → stock audit trail
├── carts / cart_items            → customer orders in progress
├── orders / order_items          → completed orders
├── order_items                   → (now has kitchen_status, order_type, table_number)
├── bookings                      → reservations / pre-orders
├── booking_reservations          → temporary holds
├── reviews                       → customer feedback
├── support_tickets               → support system
├── metrics.vendor_daily          → cafe daily metrics
├── metrics.platform_daily        → platform-wide metrics
└── 60+ more tables...
```

---

# PHASE 2: 5-EXPERT PANEL CONSULTATION

## 👨‍💻 Expert 1: Senior Security Architect

### Security Analysis for CafeOS

**Q1: What are the security implications of multi-role per user?**
> The existing `user_has_role()` function and RLS policies properly isolate data. Each role grants specific capabilities, and users can only access data their roles permit. The `role_version` mechanism detects stale JWT claims.

**Q2: Is cafe data properly isolated?**
> Yes. The `vendor_id` (= `cafe_id`) pattern with RLS ensures Cafe A cannot see Cafe B's data. Every sensitive table has `WHERE vendor_id = auth.uid()` or uses `user_has_role()` checks.

**Q3: QR ordering security - how do we prevent unauthorized orders?**
> **RECOMMENDATION**: 
> - Anonymous QR scan → Guest session created with `guest_token` (already implemented)
> - Order linked to `table_number` + `session_token`
> - Kitchen sees order but cannot modify customer data
> - Payment captured before order confirmation (prevents fake orders)

**Q4: Customer data collection - privacy concerns?**
> **RECOMMENDATION**:
> - Minimal data collection: phone number optional, name optional
> - No forced account creation for dine-in
> - Data retained per cafe's preference (30/60/90 day retention policy)
> - GDPR-like consent for marketing

### Security Checklist for Implementation
- [ ] RLS policies verified for all new tables
- [ ] Edge Functions use dual-client pattern (userClient + serviceClient)
- [ ] Input validation on all user-facing endpoints
- [ ] Rate limiting on QR ordering to prevent spam
- [ ] Guest tokens expire after 24 hours

---

## ⚡ Expert 2: Performance Engineer

### Performance Analysis

**Q1: Will kitchen display scale with 100+ orders/hour?**
> **ANALYSIS**: Supabase Realtime can handle 10,000+ concurrent connections. Kitchen display subscribes to `order_items` table changes with `kitchen_status` filter. With proper indexing (already added: `idx_order_items_kitchen_status`), this scales well.

**Q2: QR ordering - what's the expected load pattern?**
> **SCENARIO**: Busy cafe with 20 tables, average 30 orders/hour peak
> - Database: ~50 RPS easily handled by Supabase
> - Edge Functions: Serverless, auto-scales
> - Realtime: Each kitchen display = 1 connection, negligible

**Q3: Offline-first for counter billing?**
> **RECOMMENDATION**:
> - IndexedDB for offline order storage (PWA)
> - Sync queue when connection returns
> - Conflict resolution: timestamp-based, server wins
> - Critical for Nepal's unreliable internet

### Performance Optimizations Required
- [ ] Add composite index on `(cafe_id, created_at)` for order queries
- [ ] Use Supabase Realtime for kitchen display (not polling)
- [ ] Implement optimistic UI updates for billing
- [ ] Cache menu data client-side (Service Worker)

---

## 🗄️ Expert 3: Data Architect

### Schema Design Analysis

**Q1: How do we track customer data for groups?**
> **THE GROUP ORDERING PROBLEM** (User's concern):
> 
> *Scenario*: 5 friends visit cafe. One person scans QR and orders for all. How do we capture the other 4 people's data?
>
> **REALITY CHECK**: We CAN'T and SHOULDN'T try to capture everyone's data. This is invasive and impractical.
>
> **PRACTICAL SOLUTION**:
> 1. **Primary Contact**: The person who orders = primary contact for that visit
> 2. **Bill Splitting**: Optional "Add co-diners" for bill splitting (they enter their own phone if they want)
> 3. **Loyalty Attribution**: Points go to the orderer only (simple, fair)
> 4. **Group Size Tracking**: Just track `party_size` integer on the order
> 5. **Marketing Reality**: The orderer is the most likely repeat customer anyway
>
> **Schema Addition**:
> ```sql
> ALTER TABLE orders ADD COLUMN party_size INTEGER DEFAULT 1;
> ALTER TABLE orders ADD COLUMN primary_customer_phone TEXT;
> ALTER TABLE orders ADD COLUMN primary_customer_name TEXT;
> ```

**Q2: Pre-ordering (order before arriving) - how does this work?**
> **ARCHITECTURE**:
> - Reuse existing `booking_reservations` → rename to `order_reservations`
> - Add `scheduled_pickup_time` to orders
> - Order flow: Customer places order → Selects "Pickup in 15 min" → Order goes to kitchen queue at (now + 15 - prep_time)
>
> **Schema Addition**:
> ```sql
> ALTER TABLE orders ADD COLUMN scheduled_pickup_time TIMESTAMPTZ;
> ALTER TABLE orders ADD COLUMN is_preorder BOOLEAN DEFAULT FALSE;
> ```

**Q3: Order types - how do we distinguish dine-in, takeaway, delivery?**
> Already added: `order_type` enum on `orders` table with values `dine_in | takeaway | delivery`

### New Tables Required for CafeOS

```sql
-- Kitchen ticket system (links orders to kitchen workflow)
CREATE TABLE kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  order_id UUID NOT NULL REFERENCES orders(id),
  token_number INTEGER NOT NULL, -- Daily sequential: 1, 2, 3...
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  priority TEXT DEFAULT 'normal' 
    CHECK (priority IN ('normal', 'rush', 'vip')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  notes TEXT
);

-- Shift management for cash reconciliation
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  opening_float_cents INTEGER DEFAULT 0,
  expected_cash_cents INTEGER,
  actual_cash_cents INTEGER,
  variance_cents INTEGER,
  variance_reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
  notes TEXT
);

-- Daily expenses tracking (for profit calculation)
CREATE TABLE daily_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN (
    'ingredients', 'dairy', 'vegetables', 'groceries', 
    'utilities', 'rent', 'salary', 'fuel', 'other'
  )),
  amount_cents INTEGER NOT NULL,
  supplier_name TEXT,
  notes TEXT,
  is_paid BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredient recipes (for food cost calculation)
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  product_id UUID NOT NULL REFERENCES products(id),
  ingredient_variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity_per_unit NUMERIC(10,3) NOT NULL, -- e.g., 10g tea per 1 cup
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'pcs')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waste tracking
CREATE TABLE waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  ingredient_variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'expired', 'spoiled', 'dropped', 'overcooked', 
    'customer_return', 'quality_issue', 'other'
  )),
  shift_id UUID REFERENCES shifts(id),
  logged_by UUID REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

---

## 🎨 Expert 4: Frontend/UX Engineer

### UX Analysis for Nepal Cafe Context

**Q1: What's the ideal counter billing flow?**
> **3-TAP MAXIMUM RULE**:
> 1. Tap menu item → Added to bill
> 2. Tap payment method → Cash/eSewa/Khalti
> 3. Tap confirm → Bill complete, KOT sent to kitchen
>
> **SPEED TARGET**: 3-item bill in under 8 seconds

**Q2: Kitchen display - what do cooks need to see?**
> **KITCHEN DISPLAY REQUIREMENTS**:
> - Order queue sorted by time (oldest first)
> - Color coding: Green (new), Yellow (5+ min), Red (10+ min)
> - Large touch targets for "Start" and "Ready" buttons
> - Audio ping for new orders
> - Works on cheap Android tablets

**Q3: QR ordering customer flow?**
> **CUSTOMER JOURNEY (QR SCAN)**:
> ```
> Scan QR on table → See menu (no login required)
>                  → Tap items to add
>                  → Review order + table number auto-filled
>                  → Optional: Enter phone for updates
>                  → Place order (payment: later or now)
>                  → Kitchen gets ticket
>                  → Customer sees "Preparing..." status
>                  → Notification when ready
> ```

**Q4: How do small cafes (1-2 staff) manage multiple roles?**
> **ROLE-BASED DASHBOARD ACCESS**:
> - User with `[vendor, kitchen, counter]` roles sees:
>   - Header dropdown: "Switch to: Counter | Kitchen | Dashboard"
> - Each view is optimized for that role's tasks
> - Same account, different views based on selected role
> - NO separate logins needed

### Frontend Pages Required

```
PUBLIC (no auth):
├── /                           → Landing page (SaaS marketing)
├── /explore                    → Cafe discovery platform
├── /[cafe-slug]                → Cafe microsite (menu, info, reviews)
├── /[cafe-slug]/menu           → Full digital menu
├── /[cafe-slug]/order          → QR ordering flow (guest checkout)

CAFE STAFF (auth: counter, kitchen, waiter):
├── /cafe/counter               → POS billing screen
├── /cafe/kitchen               → Kitchen display (order queue)
├── /cafe/tables                → Table status overview

CAFE OWNER (auth: vendor):
├── /cafe/dashboard             → Owner control center (one-screen overview)
├── /cafe/orders                → Order history and status
├── /cafe/menu                  → Menu management
├── /cafe/inventory             → Stock levels, ingredients
├── /cafe/expenses              → Daily expense entry
├── /cafe/reports               → Sales, profit, trends
├── /cafe/staff                 → Staff management (roles, access)
├── /cafe/settings              → Cafe profile, hours, printer

PLATFORM ADMIN (auth: admin):
├── /admin/dashboard            → Platform overview (all cafes)
├── /admin/cafes                → Manage cafes, approvals
├── /admin/support              → Support tickets
```

---

## 🔬 Expert 5: Principal Engineer (Integration & Systems)

### End-to-End Flow Analysis

**FLOW 1: Dine-in Customer (QR Order)**
```
Customer                    System                         Kitchen
────────                    ──────                         ───────
Scans QR on table
        ──────────────────→ Load /[cafe-slug]/order?table=5
                            Show menu (cached, fast)
Taps "Momo x2, Chiya x1"
        ──────────────────→ Add to local cart (optimistic)
Taps "Place Order"
        ──────────────────→ Create order (order_type: dine_in)
                            Generate kitchen_ticket (token #47)
                            Push to Realtime channel
                                        ───────────────────→ New order ping
                                                            "Table 5: Momo x2, Chiya x1"
                                        Mark "Preparing"
                                        ←───────────────────
                            Update order_item.kitchen_status
        ←────────────────── "Your order is being prepared"
                                        Mark "Ready"
                                        ←───────────────────
                            Update status
        ←────────────────── "Your order is ready!"
Picks up food
```

**FLOW 2: Counter Billing (Staff)**
```
Counter Staff               System                         Kitchen
─────────────               ──────                         ───────
Opens /cafe/counter
        ──────────────────→ Load POS interface
Taps "Chiya" x2
        ──────────────────→ Add to running bill (local state)
Taps "Momo" x1
        ──────────────────→ Add to bill
Customer: "Cash please"
Taps "Cash" → "Confirm"
        ──────────────────→ Create order (order_type: dine_in)
                            Create kitchen_ticket
                            Deduct inventory (if recipes configured)
                            Print receipt (if printer connected)
                                        ───────────────────→ KOT appears
                            Return token number "47"
Says "Token 47!"
```

**FLOW 3: Pre-Order (Order Before Arriving)**
```
Customer (not at cafe)      System                         Kitchen
──────────────────────      ──────                         ───────
Visits cafe website
/sunshine-cafe/order
        ──────────────────→ Show menu + "Schedule Pickup" option
Adds items, selects
"Pickup in 20 minutes"
        ──────────────────→ Create order with:
                            - scheduled_pickup_time = now + 20 min
                            - is_preorder = true
                            - status = 'scheduled'
                            
                            Calculate: If prep_time = 5 min,
                            send to kitchen at now + 15 min
                            
(15 min later)
                            Job triggers, creates kitchen_ticket
                                        ───────────────────→ "PREORDER: Ready by 4:35pm"
                                        Prepares order
                                        Marks "Ready"
Customer arrives at cafe
        ←────────────────── Already waiting for pickup!
```

### Edge Cases & Failure Modes

| Scenario | Handling |
|----------|----------|
| Kitchen tablet offline | Orders queue locally, sync when back online |
| Double-tap creates duplicate order | Idempotency key on order creation |
| Customer leaves without paying (dine-in QR) | Order marked 'unpaid', reported in shift close |
| Prep time exceeds 20 min | Auto-escalate priority, ping owner |
| Wrong item marked ready | Kitchen can "Undo Ready" within 2 min |
| Cafe owner wants to see kitchen view | Has both roles, switches via dropdown |

---

# PHASE 3: CONSISTENCY CHECK

## 3.1 Pattern Matching with KB Stylish Codebase

| Pattern | KB Stylish Implementation | CafeOS Compliance |
|---------|--------------------------|-------------------|
| Database functions | `public.*` = SECURITY INVOKER, `private.*` = SECURITY DEFINER | ✅ Follow same |
| Edge Functions | Dual-client pattern, CORS headers, errorResponse() | ✅ Follow same |
| Frontend auth | `getCurrentUser()` in `src/lib/auth.ts`, capability checks | ✅ Extend with cafe roles |
| State management | Zustand stores, server components for data | ✅ Follow same |
| RLS policies | `user_has_role()` helper, vendor_id isolation | ✅ Follow same |
| API routes | `/api/[resource]/[action]` pattern | ✅ Follow same |

## 3.2 Anti-Patterns to Avoid

- ❌ Hardcoded cafe IDs (use `auth.uid()` or param)
- ❌ Direct DB access from client (use RPC functions)
- ❌ Polling for kitchen updates (use Realtime)
- ❌ Storing sensitive data in localStorage
- ❌ Creating new auth patterns (use existing `user_has_role`)

---

# PHASE 4: SOLUTION BLUEPRINT

## 4.1 Approach: FORK & ADAPT (Surgical)

**Estimated Effort**: 3-4 weeks to MVP (vs 3-4 months from scratch)

### What We Keep (No Changes)
- Authentication system (100%)
- User/Role management (100%)
- Supabase infrastructure (100%)
- Payment integrations (100%)
- Support system (100%)
- Email system (100%)

### What We Adapt (Modify)
- `vendor/dashboard` → `cafe/dashboard`
- `vendor/products` → `cafe/menu`
- `vendor/inventory` → `cafe/inventory` (add recipes)
- Homepage → CafeOS SaaS landing
- Order flow → Add order_type, table, kitchen workflow

### What We Add (New)
- Kitchen display (`/cafe/kitchen`)
- Counter POS (`/cafe/counter`)
- QR ordering (`/[cafe-slug]/order`)
- Cafe discovery (`/explore`)
- Shift management
- Daily expense tracking
- Pre-order scheduling

### What We Remove
- Electrical-specific attributes
- B2B bulk features
- Stylist-specific booking features (keep generic booking for pre-orders)
- ❌ Udhari/Credit tracking (user decision: most cafes don't use it)
- ❌ IRD Sajilo (user decision: not needed now)

---

## 4.2 Implementation Phases

### PHASE A: Foundation (Days 1-5)
**Goal**: Basic billing + menu + kitchen display working

1. **Database migrations**
   - Add `kitchen_tickets` table
   - Add `shifts` table
   - Verify order fields (order_type, table_number, kitchen_status)
   - Add cafe-specific RLS policies

2. **Frontend: Counter POS** (`/cafe/counter`)
   - Large tap-target buttons by category
   - Running total
   - Payment mode selection (Cash, eSewa, Khalti)
   - One-tap confirm → creates order + kitchen ticket

3. **Frontend: Kitchen Display** (`/cafe/kitchen`)
   - Supabase Realtime subscription to `kitchen_tickets`
   - Order queue with status colors
   - "Start" / "Ready" / "Served" buttons
   - Audio ping for new orders

4. **Role-based routing**
   - Add `cafe_*` capabilities to `auth.ts`
   - Dashboard role switcher component
   - Protect routes by capability

### PHASE B: Customer Ordering (Days 6-10)
**Goal**: QR ordering + cafe microsite live

5. **Cafe Microsite** (`/[cafe-slug]`)
   - Fetch cafe profile + menu from DB
   - Display menu with categories, prices, photos
   - Reviews section
   - Contact info + map

6. **QR Ordering** (`/[cafe-slug]/order`)
   - Table number from QR param or manual entry
   - Add to cart (guest session)
   - Place order → kitchen ticket
   - Order status tracking (Realtime)
   - Optional phone number for notifications

7. **Cafe Discovery** (`/explore`)
   - List all cafes with search/filter
   - Location-based (optional)
   - Link to each cafe's microsite

### PHASE C: Owner Dashboard (Days 11-15)
**Goal**: Complete owner visibility

8. **Owner Dashboard** (`/cafe/dashboard`)
   - Today's revenue (live)
   - Order count + avg value
   - Active orders in kitchen
   - Quick links to menu, reports, settings

9. **Expense Tracking** (`/cafe/expenses`)
   - Quick expense entry (category, amount, supplier)
   - Daily expense list
   - Monthly summary

10. **Reports** (`/cafe/reports`)
    - Daily/weekly/monthly sales
    - Item-wise performance
    - Payment method breakdown
    - Profit calculation (revenue - expenses)

### PHASE D: Operations (Days 16-20)
**Goal**: Shift management + inventory

11. **Shift Management**
    - Open shift (with opening float)
    - Close shift (cash reconciliation)
    - Variance reporting
    - Shift history

12. **Inventory & Recipes**
    - Ingredient stock levels
    - Recipe definitions (item → ingredients)
    - Auto-deduction on order (optional)
    - Low stock alerts

13. **Pre-ordering**
    - Schedule pickup time
    - Delayed kitchen ticket creation
    - Customer notifications

### PHASE E: Polish & Launch (Days 21-25)
**Goal**: Production-ready

14. **PWA Setup**
    - Service worker for offline billing
    - IndexedDB for offline orders
    - Sync queue

15. **Landing Page**
    - SaaS marketing site
    - Pricing (single tier initially)
    - Sign-up flow

16. **Testing & Deploy**
    - E2E tests for critical flows
    - Performance testing
    - Production deployment

---

## 4.3 Payment Model: ORDER FIRST, PAY LATER

### Critical Distinction from E-commerce

Unlike typical e-commerce (KB Stylish), CafeOS uses **deferred payment**:

```
E-COMMERCE (KB Stylish):     CAFE (CafeOS):
─────────────────────────    ─────────────────────────
Cart → Pay → Order Created   Cart → Order Created → Pay Later
      ↓                            ↓
   Payment Gateway              Kitchen starts immediately
      ↓                            ↓
   Order Confirmed              Customer pays when:
                                  • At counter (cash/card/QR)
                                  • Via website before leaving
                                  • Via website at pickup (pre-order)
```

### Payment Status Flow

```sql
-- Order payment_status values for CafeOS:
'unpaid'      → Order placed, no payment yet (default for dine-in/QR)
'pending'     → Payment initiated but not confirmed
'paid'        → Payment confirmed
'partial'     → Partial payment (future: bill splitting)
'refunded'    → Full refund issued
```

### Implementation Details

1. **QR Ordering (Dine-in)**
   - Customer scans QR → Orders from menu
   - Order created with `payment_status = 'unpaid'`
   - Kitchen ticket generated immediately
   - Customer pays at counter when leaving OR via "Pay Now" button

2. **Counter Billing (Staff)**
   - Staff adds items → Customer pays immediately (usually)
   - OR creates unpaid order for "Tab" customers
   - Cash reconciliation at shift close

3. **Pre-ordering**
   - Customer orders online → Pays NOW (required for pre-orders)
   - Uses existing payment gateway flow
   - Kitchen ticket created at scheduled time

4. **Payment Options**
   - **Cash**: Counter staff marks as paid
   - **eSewa/Khalti**: Customer scans QR at counter OR pays via website
   - **Card**: Future (NPX integration)

### Database Changes Required

```sql
-- Add payment_status to orders (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT 
  DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'partial', 'refunded'));

-- Add payment_received_at for reconciliation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;

-- Add payment_received_by (staff who received payment)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_received_by UUID REFERENCES auth.users(id);
```

### Security Considerations

- **Unpaid orders risk**: Track unpaid orders per shift, report at close
- **Walk-outs**: Flag orders unpaid after 2 hours, notify owner
- **Pre-order guarantee**: Pre-orders REQUIRE payment upfront

---

## 4.4 Feature Decisions (Based on User Input)

| Feature | Decision | Rationale |
|---------|----------|-----------|
| **Udhari (Credit)** | ❌ NOT implementing | User: "Many cafes don't give udhari" |
| **IRD Sajilo** | ❌ NOT implementing now | User: "Not needed right now" |
| **QR Ordering** | ✅ Full ordering, not just menu | User: "Make customer able to order from QR" |
| **Deferred Payment** | ✅ Order first, pay later | User: "Pay at last from counter or website" |
| **Pre-ordering** | ✅ Implement | User: "Order 15 min before arriving" |
| **Pricing Tiers** | ❌ Single tier initially | Simplicity first, add tiers later |
| **Customer Tracking** | ✅ Minimal (phone optional) | Privacy-first, track orderer only |
| **Group Data Collection** | ❌ Don't force | User concern addressed: track party_size, not individuals |

---

## 4.4 Customer Data Strategy (Addressing User's Concern)

### The Group Ordering Problem - SOLVED

**User's Concern**: "How do we get data from a whole group when one person orders?"

**Answer**: We don't try to capture everyone. Here's why and what we do instead:

1. **Reality Check**: 
   - Forcing 5 people to enter data = 0 people enter data
   - One person ordering is the DECISION MAKER and most likely to return
   - Group members follow the decision maker

2. **What We Capture**:
   ```
   Order Data:
   ├── party_size: 5              → Know it was a group
   ├── primary_phone: optional    → Orderer's phone (for updates)
   ├── primary_name: optional     → Orderer's name
   └── table_number: 7            → Know where they sat
   ```

3. **How This Helps Marketing**:
   - "Customer X brings groups of 4-5 people on average"
   - "Groups spend Rs 2,400 vs solo Rs 450"
   - "Target: 'Bring 3 friends, get 20% off'"
   - More valuable insight than random phone numbers

4. **Optional Bill Splitting** (Future):
   - When splitting bill, others CAN enter their phone
   - No forcing, just option
   - Those who want to be tracked, can be

---

# PHASE 5-7: EXPERT PANEL REVIEW (Condensed)

## Security Review ✅
- RLS policies follow existing KB Stylish pattern
- Guest sessions expire in 24 hours
- Kitchen can't access customer PII (only names on orders)
- Payment handled by existing secure integrations

## Performance Review ✅
- Realtime for kitchen display (efficient)
- Offline-first PWA for counter (robust)
- Indexes added for kitchen queries
- Menu cached client-side

## Data Review ✅
- Schema normalized appropriately
- Foreign keys maintain integrity
- Migrations are idempotent
- Rollback plan: each migration reversible

## UX Review ✅
- 3-tap billing achievable
- Kitchen display works on cheap tablets
- QR flow requires no login
- Role switching via dropdown (not separate accounts)

## Integration Review ✅
- End-to-end flows documented
- Failure modes handled
- Monitoring via Sentry (already integrated)
- Supabase handles infrastructure

---

# IMPLEMENTATION CHECKLIST

## Week 1: Foundation
- [ ] Verify database migrations applied (kitchen_tickets, shifts, etc.)
- [ ] Create `/cafe/counter` POS page
- [ ] Create `/cafe/kitchen` display page
- [ ] Implement Realtime subscription for kitchen
- [ ] Add role switcher to header
- [ ] Test counter → kitchen flow

## Week 2: Customer Ordering
- [ ] Create `/[cafe-slug]` microsite
- [ ] Create `/[cafe-slug]/order` QR ordering
- [ ] Implement guest cart for QR orders
- [ ] Add table_number handling
- [ ] Connect QR orders to kitchen
- [ ] Create `/explore` discovery page

## Week 3: Owner Dashboard
- [ ] Create `/cafe/dashboard` owner view
- [ ] Implement `/cafe/expenses` tracking
- [ ] Create `/cafe/reports` with profit calculation
- [ ] Add shift open/close workflow
- [ ] Implement cash reconciliation

## Week 4: Polish & Launch
- [ ] PWA offline support for counter
- [ ] Pre-order scheduling
- [ ] Landing page + sign-up flow
- [ ] E2E tests for critical paths
- [ ] Production deployment
- [ ] Onboard first 3 test cafes

---

# APPENDIX A: DATABASE MIGRATION SCRIPT

```sql
-- Migration: CafeOS Core Tables
-- File: YYYYMMDDHHMMSS_cafeos_core_tables.sql

BEGIN;

-- Kitchen tickets (already created in previous session, verify exists)
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  priority TEXT DEFAULT 'normal' 
    CHECK (priority IN ('normal', 'rush', 'vip')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  notes TEXT
);

-- Enable RLS
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;

-- RLS: Staff can see their cafe's tickets
CREATE POLICY kitchen_tickets_select ON kitchen_tickets
  FOR SELECT USING (
    cafe_id IN (
      SELECT user_id FROM vendor_profiles WHERE user_id = auth.uid()
    ) OR
    public.user_has_role(auth.uid(), 'kitchen') OR
    public.user_has_role(auth.uid(), 'counter') OR
    public.user_has_role(auth.uid(), 'admin')
  );

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  opening_float_cents INTEGER DEFAULT 0,
  expected_cash_cents INTEGER,
  actual_cash_cents INTEGER,
  variance_cents INTEGER,
  variance_reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
  notes TEXT
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Daily expenses
CREATE TABLE IF NOT EXISTS daily_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN (
    'ingredients', 'dairy', 'vegetables', 'groceries', 
    'utilities', 'rent', 'salary', 'fuel', 'other'
  )),
  amount_cents INTEGER NOT NULL,
  supplier_name TEXT,
  notes TEXT,
  is_paid BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

-- Recipes (ingredient → menu item mapping)
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity_per_unit NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'pcs')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Waste logs
CREATE TABLE IF NOT EXISTS waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  ingredient_variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity NUMERIC(10,3) NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'expired', 'spoiled', 'dropped', 'overcooked', 
    'customer_return', 'quality_issue', 'other'
  )),
  shift_id UUID REFERENCES shifts(id),
  logged_by UUID REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

-- Add pre-order fields to orders (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'scheduled_pickup_time') THEN
    ALTER TABLE orders ADD COLUMN scheduled_pickup_time TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'is_preorder') THEN
    ALTER TABLE orders ADD COLUMN is_preorder BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'party_size') THEN
    ALTER TABLE orders ADD COLUMN party_size INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'primary_customer_phone') THEN
    ALTER TABLE orders ADD COLUMN primary_customer_phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'primary_customer_name') THEN
    ALTER TABLE orders ADD COLUMN primary_customer_name TEXT;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_cafe_status 
  ON kitchen_tickets(cafe_id, status) 
  WHERE status IN ('pending', 'preparing');

CREATE INDEX IF NOT EXISTS idx_shifts_cafe_status 
  ON shifts(cafe_id, status) 
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_orders_preorder 
  ON orders(scheduled_pickup_time) 
  WHERE is_preorder = TRUE AND status = 'scheduled';

COMMIT;
```

---

# APPENDIX B: KEY DATABASE FUNCTIONS

```sql
-- Generate next kitchen token number (daily reset)
CREATE OR REPLACE FUNCTION generate_kitchen_token(p_cafe_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token INTEGER;
BEGIN
  SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token
  FROM kitchen_tickets
  WHERE cafe_id = p_cafe_id
    AND DATE(created_at) = CURRENT_DATE;
  
  RETURN v_token;
END;
$$;

-- Create kitchen ticket when order is placed
CREATE OR REPLACE FUNCTION create_kitchen_ticket(
  p_order_id UUID,
  p_priority TEXT DEFAULT 'normal',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cafe_id UUID;
  v_token INTEGER;
  v_ticket_id UUID;
BEGIN
  -- Get cafe_id from order
  SELECT vendor_id INTO v_cafe_id FROM orders WHERE id = p_order_id;
  
  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Generate token number
  v_token := generate_kitchen_token(v_cafe_id);
  
  -- Create ticket
  INSERT INTO kitchen_tickets (cafe_id, order_id, token_number, priority, notes)
  VALUES (v_cafe_id, p_order_id, v_token, p_priority, p_notes)
  RETURNING id INTO v_ticket_id;
  
  RETURN v_ticket_id;
END;
$$;

-- Update kitchen ticket status
CREATE OR REPLACE FUNCTION update_kitchen_ticket_status(
  p_ticket_id UUID,
  p_new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE kitchen_tickets
  SET 
    status = p_new_status,
    started_at = CASE WHEN p_new_status = 'preparing' AND started_at IS NULL THEN NOW() ELSE started_at END,
    ready_at = CASE WHEN p_new_status = 'ready' AND ready_at IS NULL THEN NOW() ELSE ready_at END,
    served_at = CASE WHEN p_new_status = 'served' AND served_at IS NULL THEN NOW() ELSE served_at END
  WHERE id = p_ticket_id;
  
  -- Also update order_items kitchen_status
  UPDATE order_items
  SET kitchen_status = p_new_status
  WHERE order_id = (SELECT order_id FROM kitchen_tickets WHERE id = p_ticket_id);
END;
$$;

-- Calculate daily profit
CREATE OR REPLACE FUNCTION get_daily_profit(
  p_cafe_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  revenue_cents BIGINT,
  expense_cents BIGINT,
  profit_cents BIGINT,
  order_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(o.total_amount_cents), 0)::BIGINT as revenue_cents,
    COALESCE((SELECT SUM(amount_cents) FROM daily_expenses 
      WHERE cafe_id = p_cafe_id AND expense_date = p_date), 0)::BIGINT as expense_cents,
    (COALESCE(SUM(o.total_amount_cents), 0) - 
     COALESCE((SELECT SUM(amount_cents) FROM daily_expenses 
       WHERE cafe_id = p_cafe_id AND expense_date = p_date), 0))::BIGINT as profit_cents,
    COUNT(o.id)::INTEGER as order_count
  FROM orders o
  WHERE o.vendor_id = p_cafe_id
    AND DATE(o.created_at) = p_date
    AND o.status NOT IN ('cancelled', 'refunded');
END;
$$;
```

---

# APPENDIX C: ROLE CAPABILITIES MAPPING

Update `src/lib/auth.ts` to add cafe-specific capabilities:

```typescript
export interface UserCapabilities {
  // Existing
  canAccessAdmin: boolean
  canManageProducts: boolean
  canManageBookings: boolean
  canViewAnalytics: boolean
  canManageUsers: boolean
  canAccessVendorDashboard: boolean
  canAccessStylistDashboard: boolean
  canBookServices: boolean
  canViewProfile: boolean
  
  // New for CafeOS
  canAccessCafeCounter: boolean    // counter role
  canAccessCafeKitchen: boolean    // kitchen role
  canAccessCafeDashboard: boolean  // vendor (cafe owner) role
  canManageCafeMenu: boolean       // vendor role
  canManageCafeStaff: boolean      // vendor role
  canCloseShift: boolean           // counter, vendor
  canViewCafeReports: boolean      // vendor
}

// In mapRolesToCapabilities:
case 'counter':
  capabilities.canAccessCafeCounter = true
  capabilities.canCloseShift = true
  capabilities.canViewProfile = true
  break

case 'kitchen':
  capabilities.canAccessCafeKitchen = true
  capabilities.canViewProfile = true
  break

case 'vendor':  // cafe owner
  capabilities.canAccessCafeDashboard = true
  capabilities.canAccessCafeCounter = true
  capabilities.canAccessCafeKitchen = true
  capabilities.canManageCafeMenu = true
  capabilities.canManageCafeStaff = true
  capabilities.canCloseShift = true
  capabilities.canViewCafeReports = true
  capabilities.canManageProducts = true
  capabilities.canViewAnalytics = true
  capabilities.canViewProfile = true
  break
```

---

*End of CafeOS Production Implementation Plan v1.0*

**Next Steps**:
1. Review this document
2. Apply database migrations
3. Begin Phase A implementation
4. Iterate based on first 3 test cafes feedback
