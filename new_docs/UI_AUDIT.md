# CafeOS UI/UX Audit — Every Screen, Honestly

> Phase 1 Track C: UI/UX audit every screen

---

## Screen-by-Screen Audit

### 1. Dashboard (`/cafe/dashboard`)

**What works:**
- Clean stat cards with icon + value + subtitle pattern
- Unpaid orders alert banner with CTA — good urgency design
- Quick links grid with colored icons — recognizable at a glance
- Recent orders list with token numbers and payment status badges

**What's broken or missing:**
- **No greeting**: Opens with "The Tea House / Owner Dashboard" — no "Good morning, Ram" or time-awareness
- **12 quick links = visual noise**: Counter POS, Kitchen, Orders, Story, Shifts, Customers, Inventory, Promotions, Staff Performance, Menu, Reports, Settings — all equal weight. A cafe owner opening this at 6 AM needs Counter POS front and center, not buried in a 6x2 grid
- **Stat cards are static**: Revenue shows "Rs 12,910" but no trend arrow, no vs-yesterday, no sparkline. The number means nothing without context
- **Expenses section is underwhelming**: Just three lines (expenses, revenue, profit). No breakdown, no chart, no insight
- **No Aaja Ko Katha integration**: Daily story quick link exists but no inline card preview on dashboard
- **Color palette**: Pure gray-100 background, white cards, orange-600 accents. Functional but cold. No warmth for a cafe product

**Recommendations:**
1. Time-aware greeting: "शुभ प्रभात! ☀️" (morning) / "शुभ दिन!" (afternoon)
2. Smart quick links: Show top 4 contextually (morning = Counter + Kitchen, evening = Shift Close + Story)
3. Trend indicators on stat cards: "↑ 12% vs yesterday"
4. Inline Aaja Ko Katha compact card
5. Warm color treatment — amber/warm-orange gradient header

---

### 2. Counter POS (`/cafe/counter`)

**What works:**
- Grid/list toggle for menu items
- Category filter tabs
- Cart with quantity +/- controls
- Customer phone lookup with auto-recognition
- Shift open/close integration
- Order type selector (dine_in/takeaway/delivery)
- Toast feedback on every action

**What's broken or missing:**
- **Too much visible at once**: Customer name, phone, table number, party size, order type — all visible before any item is added. Progressive disclosure needed
- **No keyboard shortcuts**: A busy cafe counter person shouldn't need to move the mouse for every tea order. `T` for tea, `Enter` to confirm
- **No quick-add favorites**: Top 5 items should have dedicated large buttons at the top
- **Cart section competes with menu**: Both are full-width columns. Cart should be a fixed sidebar on desktop
- **No order history quick-view**: "What did table 3 order?" requires navigating away
- **Payment modal flow**: Works but no visual confirmation animation. Just a toast
- **Token display after order**: Shows in toast only — should be a prominent modal with large token number for the customer to see

**Recommendations:**
1. Collapse customer/table fields until first item added
2. Add "Quick Order" row at top with top-5 items as large tap targets
3. Keyboard shortcut overlay (press `?` to see shortcuts)
4. Order success: Full-screen token display for 3 seconds
5. Fixed right sidebar for cart on desktop

---

### 3. Kitchen Display (`/cafe/kitchen`)

**What works:**
- Dark mode — correct for kitchen visibility
- Color-coded urgency borders (green → yellow → orange → red with pulse)
- Large token numbers (4xl) — visible from across the kitchen
- Real-time Supabase subscription with polling fallback
- Audio notification via Web Audio API (pleasant A5 ding)
- Fullscreen mode
- Footer with color legend

**What's broken or missing:**
- **No auto-sort by urgency**: Tickets render in insertion order. A 15-min-old ticket should float to the top
- **Empty state is bland**: "No orders in queue / New orders will appear here" — should celebrate the pause: "Kitchen all clear! 🎉 Take a breather"
- **No ticket count in page title**: Browser tab should show "(3) Kitchen - The Tea House" for tab-glance awareness
- **No estimated time**: No ETA for customers. Could auto-calculate from average prep time
- **Items don't show variant**: Just "Masala Tea" — should say "Masala Tea (Large)" if there are size variants

**Recommendations:**
1. Auto-sort: urgent tickets first, then by creation time
2. Celebratory empty state with animation
3. `document.title` update with ticket count
4. Show variant name alongside product name

---

### 4. Menu Management (`/cafe/menu`)

**What works:**
- Grouped by category — logical organization
- Shows variant prices as orange pills
- Active/hidden toggle indicator
- Empty state with CTA to add first item

**What's broken or missing:**
- **No inline editing**: Must navigate to `/cafe/menu/{id}/edit` — slow for price changes
- **No drag-to-reorder**: Categories and items have no sort control
- **No product images**: Every menu item is text-only. Even a placeholder icon would help
- **No bulk operations**: Can't select multiple items to disable/enable/delete
- **No search on this page**: With 40+ items, scrolling to find one is slow
- **Edit page may not exist**: Link goes to `/cafe/menu/${item.id}/edit` but I didn't find this route

**Recommendations:**
1. Inline price editing (click price → input → save)
2. Add Search input (already imported but unused)
3. Verify `/cafe/menu/[id]/edit` route exists, create if missing
4. Category emoji/icon support

---

### 5. Expenses (`/cafe/expenses`)

**What works:**
- Beautiful gradient profit summary card (best-looking component in the app)
- Nepal-specific categories with Nepali labels and emoji
- Quick add form with category grid selector
- Supplier field
- Delete with confirmation

**What's broken or missing:**
- **Broken emoji**: Lines 47-49 — `utilities` and `salary` emoji render as `�` (mojibake). Need to fix the actual unicode characters
- **No date navigation**: Locked to today only. Can't view yesterday's expenses
- **No recurring expenses**: Have to manually add milk every single day
- **Category initial state**: `useState('dudh')` but category IDs are `dairy`, `vegetables`, etc. — the initial state `'dudh'` doesn't match any category ID, so the first expense will have wrong category
- **No expense summary chart**: Just a list. A pie chart by category would add insight instantly

**Recommendations:**
1. Fix broken emoji characters immediately
2. Fix initial category state from `'dudh'` to `'dairy'`
3. Add date picker for historical expenses
4. Add "repeat yesterday's expenses" quick action

---

### 6. Shift History (`/cafe/shift`)

**What works:**
- Summary cards (total shifts, perfect matches, short shifts, net variance)
- Color-coded variance per shift
- Cash shortage pattern detection with warning banner
- Time range display (opened → closed)

**What's broken or missing:**
- **No variance trend chart**: 30 days of data but zero visualization. A sparkline showing variance over time would instantly reveal patterns
- **No drill-down**: Can't click a shift to see its orders/cash breakdown
- **No current shift status**: If a shift is open, should show prominently at top
- **Variance reason display**: Shows in quotes but no categorization or aggregation

**Recommendations:**
1. Add sparkline/mini-chart at the top showing 30-day variance trend
2. Link each shift to its orders for drill-down
3. Prominent "Current Shift" banner when shift is open

---

### 7. Customer Chinha (`/cafe/customers`)

**What works:**
- Summary stats (total, regulars, revenue, avg visits)
- Customer list sorted by visits
- Usual items display
- Reward eligibility detection

**What's broken or missing:**
- **No search/filter**: Can't search by name or phone
- **No individual customer page**: Can't see a customer's full order history
- **Reward system is display-only**: Detects eligibility but has no actual reward mechanism
- **No customer segments**: No visual grouping (VIP, regular, new, at-risk)
- **Last visit not shown**: `last_visit_at` exists but isn't displayed in the list

**Recommendations:**
1. Add search by name/phone
2. Show "last seen X days ago" for each customer
3. Visual segment badges (🌟 VIP, 🆕 New, ⚠️ At Risk)

---

### 8. Inventory/Saman Hisab (`/cafe/inventory`)

**What works:**
- Ingredient CRUD with Nepali names
- Stock status badges (In Stock, Running Low, Low Stock, Out of Stock)
- Stock update modal with cost tracking
- Low stock alerts section

**What's broken or missing:**
- **Zero recipes linked**: `recipes` table has 0 rows. Inventory exists in isolation
- **No auto-deduction**: Selling a Masala Tea doesn't reduce milk/sugar stock
- **No purchase history**: Stock updates happen but no history view
- **Supplier management**: Just a text field, no supplier directory

**Recommendations:**
1. Create recipe templates during Sajilo Suru
2. Add basic auto-deduction on order completion
3. Show stock history per ingredient

---

### 9. Sajilo Suru Setup (`/cafe/setup`)

**What works:**
- 4-step wizard (type → menu → costs → projection)
- 3 Nepal-specific templates (Chiya Pasal, Medium Cafe, Bakery)
- Item price override per template item
- Revenue projection based on selections

**What's broken or missing:**
- **Not tested end-to-end since P0 fix**: The function was broken; now fixed but needs verification
- **No back button in wizard**: Can only go forward
- **No template preview**: Selecting "Chiya Pasal" doesn't show what items will be created
- **Projection math is simple**: Just multiplies avg item price × estimated daily orders. No seasonality or margin calculation

---

### 10. Aaja Ko Katha (`/cafe/story`)

**What works:**
- Date navigation with previous/next
- Fetches comprehensive daily data via RPC
- Insights generated in Nepali
- Top item, busiest/slowest hour, cash variance

**What's broken or missing:**
- **Pure data dump**: Just shows JSON-shaped data as text. No narrative structure
- **No visualization**: Numbers without charts. Revenue should have a mini-bar, hours should have a heat strip
- **No emotional design**: "Today's Story" should feel like reading a journal, not a report
- **DailyStoryCard compact mode**: Exists for dashboard but isn't integrated

---

## Global UI Issues

1. **Font**: System font stack only. No custom typography that creates brand identity
2. **Color**: Orange-600 + gray palette everywhere. No warmth gradient, no brand color story
3. **Spacing**: Inconsistent — some pages use `p-4`, others `p-6`, dashboard uses `px-6 py-8`
4. **Border radius**: Mix of `rounded-lg`, `rounded-xl`, `rounded-2xl` — no system
5. **Icons**: All Lucide, which is fine, but no custom illustrations or brand marks
6. **No dark mode**: Kitchen display has it, nothing else does
7. **No mobile navigation**: CafeOSHeader hides on `/cafe/counter` and `/cafe/kitchen` but there's no bottom nav for mobile
