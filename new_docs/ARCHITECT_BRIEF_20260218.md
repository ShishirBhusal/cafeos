# Architect's Brief — February 18, 2026
## CafeOS Trademark Feature Implementation

**Author**: Chief Architect  
**Status**: APPROVED FOR IMPLEMENTATION  
**Governed by**: `new_docs/CAFEOS_EXCELLENCE_PROTOCOL.md`

---

# PART 1: RESEARCH SYNTHESIS

## 1.1 The Human Being — What We Learned

### The Nepal Cafe Owner's Daily Reality
- **5 AM start, 9 PM close**. 14-16 hour days, 7 days a week. No vacation for years.
- **Cash is king**. 85%+ transactions are cash. All expenses paid from the same cash drawer. No separation between business and personal money.
- **Mental accounting**: They know revenue ("aaja Rs 12,000 aayo") but NOT profit. Revenue ≠ Profit. They have no idea what they actually earned after expenses.
- **Trust anxiety**: The #1 psychological burden is "Is my counter person honest?" They can never fully verify. Paper systems are unreliable. The fear of Rs 500 theft causes more stress than the joy of Rs 2,000 revenue.
- **Technology trauma**: Most have tried a system before — it was complicated, crashed during rush hour, support spoke only English, and they went back to their notebook within a week.

### What Keeps Them Up at Night
1. "Paisa kata gayo?" — Where did the money go?
2. "Counter person le churayeko ta hoina?" — Is my staff stealing?
3. "Aaja kati kamaye?" — What did I actually EARN today?
4. "Bholi ko lagi kati saman kinne?" — How much supplies do I need for tomorrow?
5. "Yo mahina fayda bhayo ki ghata?" — Did I profit or lose this month?

### Behavioral Economics of Nepal Small Business
- **Loss aversion is 3x stronger than gain seeking** — Showing "you lost Rs 300 today" is 3x more motivating than "you earned Rs 6,000 today"
- **Social proof drives adoption** — "Ram dai ko cafe ma yo system cha" is the #1 sales channel
- **First 7 days determine everything** — If no "aha moment" in the first week, they abandon
- **Habit formation requires trigger → routine → reward** — The trigger must be automatic (notification), the routine must be effortless (one screen), the reward must be emotional ("aaja ramro bhayo!")

## 1.2 Competitor Autopsy

### RestroX Nepal
- **Strengths**: Good feature breadth, IRD-compliant billing, digital payment support, KDS
- **Weakness**: Complexity. Learning curve too steep for chiya pasals. Free trial model creates commitment anxiety. No network effect — each restaurant is an island.
- **User sentiment**: "Flexible but takes time to learn" — the "takes time" part kills small cafe adoption.

### Hamro SAN Nepal
- **Strengths**: Full ERP capabilities, supply chain management, accounting integration
- **Weakness**: ERP language and complexity ("journal entries", "accounts receivable") — terrifying for a chiya pasal owner who tracks money in their head. Positioned for medium-large businesses.
- **User sentiment**: "Brought order to the madness" — but the testimonials are from established businesses, not small cafes.

### Petpooja India (100K+ restaurants)
- **Key insight**: Their #1 differentiator is **anti-theft and revenue leakage detection**. They understood that the restaurant owner's deepest pain is TRUST, not operations.
- **What they got right**: CRM that doesn't require customer download, kitchen display that works on any device, 80+ customizable reports.
- **What we can learn**: Solve the TRUST problem first. Operations second.

### Toast POS (USA)
- **Why legendary retention**: Their loyalty program makes the cafe owner's CUSTOMERS love them more. When a CafeOS cafe gives better service because of CafeOS, that customer tells other cafe owners. This is the growth flywheel.
- **Key insight**: The product that makes your customer look impressive to THEIR customers creates unstoppable word of mouth.

### The Gap Nobody Fills
| Need | RestroX | Hamro SAN | Petpooja | CafeOS Today |
|------|---------|-----------|----------|-------------|
| "How much did I PROFIT today?" | ❌ Revenue only | ❌ Buried in ERP | ❌ Revenue only | ⚠️ Built but empty |
| "Is my cash count correct?" | ❌ No reconciliation | ❌ Accounting-level | ❌ Complex | ⚠️ 1 shift ever |
| "Guide me through setup" | ❌ Figure it out | ❌ Figure it out | ❌ Training needed | ❌ Empty screens |
| "Tell me my day's story" | ❌ Raw reports | ❌ Raw reports | ❌ Raw reports | ❌ Doesn't exist |
| Network intelligence | ❌ Standalone | ❌ Standalone | ⚠️ Benchmarks | ❌ Doesn't exist |

## 1.3 The Seven-Expert Panel Battle

### Expert 1 — Nepal Field Researcher
> "I visited 40 cafes. The ones that succeed have ONE thing in common: the owner KNOWS their numbers. Not roughly — exactly. Rs 8,200 in tea, Rs 3,400 in snacks, Rs 1,200 in cigarettes. They know because they've been doing this for years and their brain IS the POS. CafeOS needs to replicate that brain — but faster, more reliable, and accessible from anywhere. The dashboard shows 'Rs 0' for a new cafe. That's the opposite of helpful. Show me what my day COULD look like."

### Expert 2 — Behavioral Psychologist
> "CafeOS has a classic activation problem. The features exist but there's no behavioral trigger. You need THREE things: (1) A setup experience so good that the owner is emotionally invested within 15 minutes — they've entered THEIR menu, THEIR expenses, and seen THEIR first profit number. (2) A daily ritual trigger — a notification at closing time that says 'Your day's story is ready.' (3) A reward loop — each day they check, the data gets richer, the insights get smarter. Miss a day, and the story has gaps. The system creates gentle FOMO for their own data."

### Expert 3 — Infrastructure Architect
> "5 cafes with zero cross-pollination is not a platform, it's 5 installations. The moment you can say 'cafes in your area sell tea for Rs 28 on average, you're at Rs 25' — you have a NETWORK. That single insight is impossible for any individual cafe to generate. This is the moat. Build the data aggregation layer now, even if there are only 5 cafes. The architecture must support benchmarking from day one."

### Expert 4 — Product Designer (ex-Airbnb, ex-Notion)
> "The 'aha moment' for Airbnb hosts was seeing their first booking income projection. For Notion, it was seeing their messy notes transform into a clean database. For CafeOS, the 'aha moment' should be: owner enters their menu and fixed costs, and IMMEDIATELY sees 'Based on your menu prices and costs, if you serve 50 customers/day, your monthly profit will be approximately Rs 45,000.' That's the moment they think 'this thing understands my business.' Right now, the first 5 minutes are empty screens. That's a DEATH SENTENCE for retention."

### Expert 5 — Revenue Scientist
> "The growth loop is: Owner uses CafeOS → Their cafe runs smoother → Customers notice (faster service, correct orders, digital receipt) → Customers mention to other cafe owners → Those owners try CafeOS. The FASTEST way to activate this loop is to make the customer-facing experience visibly better. A digital receipt with the cafe's branding, a 'Your order is being prepared' screen on QR orders, a loyalty points notification. Make the END CUSTOMER the evangelist."

### Expert 6 — Security & Trust Architect
> "The shift reconciliation is the most powerful trust tool ever built for a small business. But it's buried on page 15 of the navigation. It should be UNMISSABLE. Make it impossible to end the day without it. Not through force — through gentle, smart design. At 8 PM, the system nudges: 'Ready to close the day? Let's count together.' It's not surveillance. It's partnership. 'We' count together. The math is transparent. Both owner and staff see the same numbers. Trust is built through visibility, not control."

### Expert 7 — AI/ML Researcher  
> "With even 5 cafes generating daily data, I can build: (1) Day-over-day comparison: 'Today is 15% below your Tuesday average — check if something changed.' (2) Item-level intelligence: 'Momo sales dropped 30% this week — is a supplier issue affecting quality?' (3) Cash variance pattern detection: 'Your Wednesday evening shifts consistently show Rs 200-300 shortfalls.' These aren't ML models — they're simple statistical comparisons. But they feel like intelligence because no human could track this across 30 days of data."

### THE SYNTHESIS
The experts converge on ONE insight: **CafeOS's problem is not missing features — it's missing ACTIVATION and NARRATIVE.**

Features exist but are dead (0 data). The system needs:
1. **A setup experience that populates real data in 15 minutes** (Activation)
2. **A daily story that makes checking CafeOS irresistible** (Habit Formation)  
3. **Smart cash intelligence that builds trust through transparency** (Core Value)

---

# PART 2: TRADEMARK FEATURE INVENTION

## Feature Candidates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FEATURE 1: "Sajilo Suru" — The 15-Minute Magic Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**THE REAL HUMAN MOMENT:**
Sita runs a chiya pasal in Baneshwor. Her nephew showed her CafeOS. She signed up. She sees an empty dashboard. "Menu" is empty. "Expenses" is empty. "Reports" shows nothing. She thinks: "Yo ta kei kaam ko chaina. Paisa tirna parcha ani kei dekhaudaina." She closes the app. She never opens it again.

But what IF: She opens CafeOS and a friendly wizard says "Namaste Sita ji! Let's set up your cafe in 15 minutes. First — what kind of cafe is this?" She taps "Chiya Pasal." Instantly, 15 common menu items appear: Masala Chiya Rs 25, Kalo Chiya Rs 20, Momo (Buff) Rs 120... She adjusts 3 prices, adds 2 items. Done. Next: "What's your monthly rent?" Rs 15,000. "Staff salary?" Rs 18,000 × 2. "Electricity?" Rs 3,000. Done. The dashboard IMMEDIATELY shows: "If you serve 40 customers/day at average Rs 65, your estimated monthly profit is Rs 32,000." Sita's eyes widen. She sees HER cafe in the numbers. She's hooked.

**THE INSIGHT:**
Every competitor drops you into an empty system and says "set it up yourself." This is a MASSIVE barrier for non-technical users. The cognitive load of building a menu from scratch is enough to kill adoption. Templates + guided flow = activation in 15 minutes instead of "never."

**WHAT CAFEOS DOES:**
Step-by-step wizard: Cafe Type → Menu (from template + customize) → Fixed Costs → First Shift Opening. By end: populated dashboard with projected profit. The owner has entered REAL data and seen REAL value in under 15 minutes.

**THE TECHNICAL SHAPE:**
- Menu templates stored as JSON (chiya_pasal, medium_cafe, restaurant, bakery)
- Multi-step wizard component with progress bar
- Bulk insert of products/variants/categories from template
- Fixed cost quick-entry with Nepal defaults
- Profit projection calculation from menu prices + template assumptions

**THE TRADEMARK CLAIM:**
"No other platform in Nepal can take a cafe from zero to a fully operational system with profit projections in 15 minutes — because nobody else has Nepal-specific templates and guided onboarding."

**IMPACT SCORE:**
- Retention: **10** — Without activation, retention is 0. This IS retention.
- Acquisition: **8** — "Set up in 15 minutes" is a powerful marketing claim
- Network Effect: **3** — Individual cafe, but templates improve with data
- Complexity: **Medium** — Template data + wizard UI + bulk insert

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FEATURE 2: "Aaja Ko Katha" — Today's Story (Intelligent Daily Digest)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**THE REAL HUMAN MOMENT:**
It's 9:47 PM. Ram Bahadur is walking home from his cafe in Patan. His phone buzzes: "📊 Ram ji, your day's story is ready." He opens it and sees ONE screen:

"Aaja 52 orders aayo (↑8% from last Tuesday). Rs 14,200 kamaaye. Kharcha Rs 5,100. **Nafa: Rs 7,117.** Bihana 7-9 sabai bhanda busy thiyo (18 orders). Momo sabai bhanda popular (23 plates). Cash Rs 150 badi cha — ramro! 3 naya customers aaye. Bholi Wednesday ho — usually your slowest day. Consider running a special."

Ram smiles. He KNOWS his business. Not roughly. Exactly. He doesn't need to be at the cafe to know what happened. He feels in control for the first time in 11 years.

**THE INSIGHT:**
Every POS shows REPORTS. Numbers in tables. Charts with axes. Nobody TELLS A STORY. Humans don't think in tables — they think in narratives. "It was a good day because..." is infinitely more powerful than "Revenue: Rs 14,200." The daily story transforms data into WISDOM.

**WHAT CAFEOS DOES:**
Every evening at configurable time (default 9 PM Nepal time), generates a narrative summary card. One screen. Natural language. Comparisons to own history. Highlights, lowlights, anomalies. Actionable suggestion for tomorrow. Available as in-app page and shareable image (for WhatsApp — owners LOVE sharing good days with family).

**THE TECHNICAL SHAPE:**
- Database function: `generate_daily_story(cafe_id, date)` 
- Compares today vs same weekday last week, vs 30-day average
- Identifies: top seller, busiest hour, cash variance, new customers, unusual patterns
- Returns structured JSON that frontend renders as narrative card
- Shareable as image (html2canvas or server-rendered OG image)

**THE TRADEMARK CLAIM:**
"No other platform in Nepal tells a cafe owner their day's STORY — not reports, not charts, but a human narrative that makes them feel like they have a business partner who never sleeps."

**IMPACT SCORE:**
- Retention: **10** — Daily habit loop. Miss a day, miss your story.
- Acquisition: **7** — Owners share good days on WhatsApp → social proof
- Network Effect: **6** — Comparisons get richer with more cafes
- Complexity: **Medium** — DB function + UI card + comparison logic

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FEATURE 3: "Paisa Darpan" — Money Mirror (Smart Cash Intelligence)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**THE REAL HUMAN MOMENT:**
Sunita owns a cafe in Bhaktapur. Every night she counts cash. Sometimes it matches, sometimes it's short by Rs 200-500. She suspects her evening counter person but can't prove it. She can't fire him — he's her neighbor's son. She lies awake wondering.

With Paisa Darpan: She opens "Close Day" and sees a beautiful waterfall chart. "Opening: Rs 2,000 → Cash Sales: +Rs 8,200 → Digital: -Rs 2,100 (went to eSewa) → Expenses Paid: -Rs 1,500 → **Expected Cash: Rs 6,600**." She counts: Rs 6,450. Difference: -Rs 150. The system shows: "Your 7-day average variance: -Rs 95. Your 30-day trend: improving ↑ (was -Rs 220)." She sees the PATTERN. No accusations. Just math. She can have a calm conversation: "Beta, last week average Rs 95 kam thiyo. Careful huna parcha."

**THE INSIGHT:**
Every POS that has "shift close" asks for one number: "how much cash in drawer?" Then shows the difference. That's surveillance, not intelligence. True cash intelligence shows the FLOW — where money came in, where it went out, what's the expected balance at any point. And critically, it shows TRENDS. A one-time Rs 200 short is nothing. A consistent Rs 200/day short is Rs 6,000/month leak. The trend is the truth.

**WHAT CAFEOS DOES:**
Enhanced shift close experience with: Cash flow waterfall visualization, automated expected cash calculation, 7/30-day variance trend with visual indicator, categorized payment breakdown (cash/eSewa/Khalti), gentle language that builds trust without surveillance feeling. The closing flow is designed to be PLEASANT — a satisfying end-of-day ritual, not a chore.

**THE TECHNICAL SHAPE:**
- Enhanced `close_cafe_shift` function with trend calculation
- New `get_cash_flow_waterfall(cafe_id, shift_id)` function
- New `get_variance_trend(cafe_id, days)` function  
- Beautiful waterfall chart component
- Trend sparkline in shift history

**THE TRADEMARK CLAIM:**
"No other platform in Nepal shows cafe owners WHERE their money flows throughout the day with trend intelligence — because nobody else understood that cash tracking is about PATTERNS, not just numbers."

**IMPACT SCORE:**
- Retention: **9** — Daily ritual. The satisfying close.
- Acquisition: **8** — "It caught Rs 6,000/month leak" stories spread fast
- Network Effect: **4** — Individual cafe data
- Complexity: **Medium** — Enhanced DB functions + waterfall UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FEATURE 4: "Cafe Ko Dhadkan" — Cafe Heartbeat (Live Pulse Monitor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**THE REAL HUMAN MOMENT:**
Krishna owns 2 cafes but can only be at one. At 2 PM, while at Location A, he opens CafeOS on his phone and sees Location B's heartbeat: "🟢 Live now: 3 orders in kitchen. Last order 4 min ago. Cash: Rs 5,400. Today: 28 orders, Rs 8,100 revenue. Staff on counter: Binod." He knows everything is running. 15 seconds. Phone back in pocket. Peace of mind.

**THE INSIGHT:**
Owner absence anxiety is the #2 psychological burden after theft fear. Every existing system requires the owner to open reports, navigate, filter. The heartbeat is a GLANCEABLE status — like checking if the lights are on. One screen, real-time, refreshes automatically.

**WHAT CAFEOS DOES:**
A real-time single-card widget showing: current kitchen queue size, time since last order, running cash total, running order count, who's on shift. Updates via Supabase Realtime. Designed for phone — glanceable in 5 seconds.

**IMPACT SCORE:**
- Retention: **8**, Acquisition: **6**, Network: **2**, Complexity: **Low**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FEATURE 5: "Bholi Ko Tayyari" — Tomorrow's Prep (Smart Forecasting)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**THE REAL HUMAN MOMENT:**
It's Sunday evening. Hari needs to buy supplies for Monday. How much milk? How much chicken? He guesses based on gut. Sometimes he buys too much (waste) and sometimes too little (lost sales). With CafeOS: "Based on your last 4 Mondays: ~55 orders expected. You'll need approx 6L milk, 3kg chicken, 2kg flour. Your current stock: milk 2L (buy 4L), chicken 1kg (buy 2kg), flour 3kg (sufficient)."

**IMPACT SCORE:**
- Retention: **7**, Acquisition: **7**, Network: **8** (better with more data), Complexity: **High** (requires recipes + inventory + forecasting)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### FEATURE 6: "Sabai Cafe" — Cross-Cafe Intelligence (Network Benchmarks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**THE REAL HUMAN MOMENT:**
Deepa sells tea for Rs 20. She thinks that's normal. CafeOS shows: "CafeOS cafes in Kathmandu average Rs 28 for masala tea. You're 29% below average. Increasing to Rs 25 would add ~Rs 3,750/month based on your volume." She raises the price. Nobody complains. She earns Rs 3,750 more per month. She tells every cafe owner she knows.

**IMPACT SCORE:**
- Retention: **8**, Acquisition: **9**, Network: **10** (THE network feature), Complexity: **Medium**

---

# PART 3: THE SELECTION BATTLE

## Test Results

| Feature | Nepal Reality | Day-One Value | Counter Speed | Owner Absence | Network | Can't Delete |
|---------|-------------|---------------|---------------|---------------|---------|-------------|
| Sajilo Suru | ✅ Works on any device | ✅ IMMEDIATE | ✅ N/A | ✅ N/A | ⚠️ Low | ✅ Their data |
| Aaja Ko Katha | ✅ Phone-first | ⚠️ Needs 1 day | ✅ N/A | ✅ Core purpose | ⚠️ Medium | ✅ History | 
| Paisa Darpan | ✅ Touch-friendly | ✅ First shift | ✅ N/A | ✅ Core purpose | ⚠️ Low | ✅ Trends |
| Cafe Ko Dhadkan | ✅ Glanceable | ⚠️ Needs orders | ✅ N/A | ✅ Core purpose | ❌ Low | ⚠️ Low |
| Bholi Ko Tayyari | ✅ Simple output | ❌ Needs weeks | ✅ N/A | ✅ Yes | ✅ High | ✅ History |
| Sabai Cafe | ✅ Simple numbers | ❌ Needs 50 cafes | ✅ N/A | ✅ Yes | ✅ THE one | ⚠️ Medium |

## Selected for Implementation Today

### 🏆 #1: Sajilo Suru (Easy Start Wizard)
**Why**: Without activation, nothing else matters. 0 customers, 0 recipes, 0 fixed costs in production tells us the system is dead on arrival. This is CPR for the product. Every other feature depends on having DATA in the system.

### 🏆 #2: Aaja Ko Katha (Today's Story)  
**Why**: The daily habit loop. The trigger-routine-reward cycle. The "11 PM check" that makes CafeOS indispensable. Combined with Sajilo Suru (which populates data), this creates value from Day 1.

### 🏆 #3: Paisa Darpan (Money Mirror)
**Why**: Solves the deepest emotional pain — trust and cash visibility. Enhanced shift close with waterfall + trends transforms existing feature from "meh" to "magic."

### What We're NOT Building Today (and Why)
- **Cafe Ko Dhadkan**: Real-time heartbeat requires the cafe to be ACTIVE first. Build after activation problem is solved.
- **Bholi Ko Tayyari**: Needs weeks of historical data + recipes configured. High complexity, delayed value.
- **Sabai Cafe**: Network benchmarks need 50+ cafes. Architecture should support it but visible feature is premature.

---

# PART 4: IMPLEMENTATION BLUEPRINTS

## Feature 1: Sajilo Suru (Easy Start Wizard)

### Database Schema
```sql
-- Menu templates table
CREATE TABLE cafe_menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL, -- 'chiya_pasal', 'medium_cafe', 'restaurant', 'bakery'
  display_name TEXT NOT NULL,
  display_name_np TEXT NOT NULL, -- Nepali name
  description TEXT,
  icon TEXT, -- emoji or lucide icon name
  categories JSONB NOT NULL, -- [{name, slug, sort_order}]
  items JSONB NOT NULL, -- [{name, slug, category_slug, price_cents, variants:[{sku_suffix, price_cents}]}]
  fixed_cost_defaults JSONB, -- [{type, label, typical_amount_cents}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track onboarding completion
ALTER TABLE cafe_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE cafe_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE cafe_profiles ADD COLUMN IF NOT EXISTS cafe_type TEXT; -- template_key used
```

### RLS Policies
- `cafe_menu_templates`: Public read (anyone can see templates)
- `cafe_profiles` onboarding columns: Owner can update their own

### Database Function
```sql
-- Bulk create menu from template
CREATE OR REPLACE FUNCTION setup_cafe_from_template(
  p_cafe_id UUID,
  p_template_key TEXT,
  p_item_overrides JSONB DEFAULT '[]'::jsonb, -- [{slug, price_cents, enabled}]
  p_fixed_costs JSONB DEFAULT '[]'::jsonb -- [{type, amount_cents}]
) RETURNS JSONB
```
This function:
1. Reads template data
2. Creates categories for the cafe
3. Creates products + variants with cafe's vendor_id
4. Applies price overrides from user input
5. Creates fixed cost entries
6. Marks onboarding as complete
7. Returns summary of what was created

### UI Screens
```
Step 1: WELCOME
┌─────────────────────────────┐
│  🏪 Namaste! Tapai ko cafe  │
│     setup garau 15 min ma    │
│                              │
│  Cafe ko naam: [The Tea..]   │
│                              │
│  Kun type ko cafe ho?        │
│  ┌─────┐ ┌─────┐ ┌──────┐  │
│  │☕    │ │🍽️   │ │🍰    │  │
│  │Chiya│ │Cafe │ │Bakery│  │
│  │Pasal│ │     │ │      │  │
│  └─────┘ └─────┘ └──────┘  │
│                              │
│       [Aghi Badhau →]        │
└─────────────────────────────┘

Step 2: MENU REVIEW
┌─────────────────────────────┐
│  📋 Tapai ko Menu           │
│  Template items shown.       │
│  Prices adjust garnus.       │
│                              │
│  ☑ Masala Chiya    [Rs 25 ] │
│  ☑ Kalo Chiya     [Rs 20 ] │
│  ☑ Buff Momo      [Rs 120] │
│  ☑ Veg Momo       [Rs 100] │
│  ☐ Chicken Chowmein [skip] │
│  ☑ Sandwich       [Rs 80 ] │
│  ...                         │
│  [+ Aru Item Thapnus]        │
│                              │
│  [← Pachhi] [Aghi Badhau →] │
└─────────────────────────────┘

Step 3: FIXED COSTS
┌─────────────────────────────┐
│  💰 Monthly Fixed Kharcha    │
│                              │
│  Rent:     [Rs 15,000]       │
│  Salary:   [Rs 36,000] (2×) │
│  Bijuli:   [Rs 3,000 ]      │
│  Internet: [Rs 1,500 ]      │
│  Other:    [Rs 2,000 ]      │
│                              │
│  Total: Rs 57,500/month      │
│  Daily: Rs 1,917/day         │
│                              │
│  [← Pachhi] [Aghi Badhau →] │
└─────────────────────────────┘

Step 4: PROFIT PROJECTION
┌─────────────────────────────┐
│  📊 Tapai Ko Cafe Projection│
│                              │
│  Menu items: 12              │
│  Avg item price: Rs 65       │
│  If 40 customers/day:        │
│                              │
│  ┌───────────────────────┐  │
│  │ Monthly Revenue:       │  │
│  │ Rs 78,000              │  │
│  │ Monthly Costs:         │  │
│  │ Rs 57,500              │  │
│  │ ─────────────────────  │  │
│  │ Est. Monthly Profit:   │  │
│  │ ✨ Rs 20,500 ✨        │  │
│  └───────────────────────┘  │
│                              │
│  [🚀 Suru Garau! Start!]    │
└─────────────────────────────┘
```

### Integration Points
- After wizard completes → redirect to `/cafe/dashboard` (now populated)
- Counter POS immediately has menu items to sell
- Dashboard shows projected vs actual comparison
- Fixed costs feed into daily profit calculation (existing `get_daily_profit_detailed`)

### Build Order
1. Database migration: `cafe_menu_templates` table + template data + `setup_cafe_from_template` function
2. Add onboarding columns to `cafe_profiles`
3. Create wizard UI component: `SetupWizardClient.tsx`
4. Create wizard page: `/cafe/setup/page.tsx`
5. Redirect logic: if `onboarding_completed = false` → redirect to wizard
6. Test end-to-end

## Feature 2: Aaja Ko Katha (Today's Story)

### Database Function
```sql
CREATE OR REPLACE FUNCTION get_daily_story(
  p_cafe_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
```
Returns:
```json
{
  "date": "2026-02-18",
  "day_name": "Tuesday", 
  "total_orders": 52,
  "total_revenue_cents": 1420000,
  "total_expenses_cents": 510000,
  "fixed_cost_daily_cents": 191700,
  "net_profit_cents": 711700,
  "cash_sales_cents": 980000,
  "digital_sales_cents": 440000,
  "top_item": {"name": "Buff Momo", "quantity": 23, "revenue_cents": 276000},
  "busiest_hour": {"hour": 8, "orders": 18},
  "slowest_hour": {"hour": 15, "orders": 2},
  "new_customers": 3,
  "avg_order_value_cents": 27308,
  "cash_variance_cents": 150,
  "comparison": {
    "vs_same_weekday_last_week": {"orders_pct": 8, "revenue_pct": 12},
    "vs_30_day_avg": {"orders_pct": 5, "revenue_pct": 7}
  },
  "insights": [
    "Tuesday is usually your 3rd busiest day. Today was above average.",
    "Momo sales up 15% from last week. Keep it up!",
    "Cash variance: +Rs 1.50. Perfect cash handling today! 👏"
  ],
  "tomorrow_note": "Wednesday is usually your slowest day. Consider a lunch special."
}
```

### UI Screen
New page: `/cafe/story/page.tsx` — also embedded as card in dashboard.

```
┌──────────────────────────────────┐
│  📖 Aaja Ko Katha — Tuesday      │
│  February 18, 2026               │
│                                  │
│  ┌────────────────────────────┐  │
│  │  52 Orders  ↑8% vs Tuesday │  │
│  │  Rs 14,200 Revenue         │  │
│  │  Rs 7,117 Profit ✨        │  │
│  └────────────────────────────┘  │
│                                  │
│  🏆 Top Seller: Buff Momo (23)   │
│  ⏰ Busiest: 8 AM (18 orders)    │
│  💰 Cash: +Rs 150 (Perfect! 👏)  │
│  👤 3 new customers today         │
│                                  │
│  💡 "Wednesday usually slowest.  │
│      Consider a lunch special."   │
│                                  │
│  [📤 Share on WhatsApp]          │
│  [← Previous Day] [Next Day →]  │
└──────────────────────────────────┘
```

### Build Order
1. Database function: `get_daily_story(cafe_id, date)`
2. UI component: `DailyStoryCard.tsx`
3. Page: `/cafe/story/page.tsx`
4. Embed summary card in dashboard
5. Add navigation link

## Feature 3: Paisa Darpan (Money Mirror — Enhanced Shift Close)

### Database Functions
```sql
-- Cash flow waterfall for a shift
CREATE OR REPLACE FUNCTION get_shift_cash_flow(
  p_cafe_id UUID,
  p_shift_id UUID DEFAULT NULL -- null = current shift
) RETURNS JSONB

-- Variance trend over time
CREATE OR REPLACE FUNCTION get_variance_trend(
  p_cafe_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS JSONB
```

### Enhanced Close Shift UI
Replace existing `CloseShiftModal` with richer experience:

```
┌──────────────────────────────────┐
│  💰 Paisa Darpan — Day Close     │
│                                  │
│  CASH FLOW WATERFALL:            │
│  ┌────────────────────────────┐  │
│  │ Opening     ████  Rs 2,000 │  │
│  │ +Cash Sales ████████ 8,200 │  │
│  │ -Digital    ██  -2,100     │  │
│  │ -Expenses   █  -1,500     │  │
│  │ ─────────────────────────  │  │
│  │ Expected    ██████  6,600  │  │
│  └────────────────────────────┘  │
│                                  │
│  Drawer ma kati cha?             │
│  [Rs ______]                     │
│                                  │
│  Variance: -Rs 150               │
│  7-day avg: -Rs 95 (improving ↑) │
│  ▁▂▃▂▁▂▁ trend sparkline         │
│                                  │
│  [✅ Banda Garau — Close Day]    │
└──────────────────────────────────┘
```

### Build Order
1. Database function: `get_shift_cash_flow`, `get_variance_trend`
2. Enhanced `CloseShiftModal` component with waterfall + trend
3. Integrate into shift page and dashboard

---

# PART 5: RISKS AND OPEN QUESTIONS

1. **Template accuracy**: Menu templates may not match real cafe prices. Mitigation: let users customize every price.
2. **Empty story on day 1**: Aaja Ko Katha needs at least 1 day of data. Mitigation: show projected story during onboarding.
3. **Variance trend with 1 shift**: Paisa Darpan trend needs history. Mitigation: show "Building your trend... close 3 more shifts to see patterns."
4. **Nepal timezone in DB functions**: All date comparisons must use `AT TIME ZONE 'Asia/Kathmandu'`. Critical.
5. **Mobile-first**: All new UI must be phone-first. 375px minimum. Touch targets 44px+.

---

# PART 6: WHAT WE'RE NOT BUILDING TODAY (AND WHY)

| Feature | Why Not Now |
|---------|-----------|
| Cafe Ko Dhadkan (Live Pulse) | Needs active cafe with orders flowing. Build after activation. |
| Bholi Ko Tayyari (Forecasting) | Needs weeks of data + recipes configured. High complexity. |
| Sabai Cafe (Network Benchmarks) | Needs 50+ cafes. Architecture supports it; UI premature. |
| Offline PWA | Critical but massive scope. Separate sprint. |
| SMS Integration | Requires vendor partnership. Separate sprint. |
| Receipt Printing | Hardware dependency. Separate sprint. |

---

*End of Architect's Brief*  
*Implementation begins NOW.*
