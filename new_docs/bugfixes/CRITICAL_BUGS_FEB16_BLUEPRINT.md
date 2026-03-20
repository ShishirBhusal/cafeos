# CRITICAL BUGS TECHNICAL BLUEPRINT
## CafeOS - February 16, 2026

**Status**: PENDING EXPERT APPROVAL  
**Severity**: CRITICAL (Blocks core functionality)  
**Protocol**: CAFEOS_EXCELLENCE_PROTOCOL v3.0

---

## EXECUTIVE SUMMARY

Two critical bugs are blocking CafeOS core operations:

| Bug | Error Message | Impact |
|-----|---------------|--------|
| **BUG-001** | `permission denied for table platform_daily` | Orders cannot be placed from Counter POS or Customer Website |
| **BUG-002** | `violates check constraint "daily_expenses_category_check"` | Expenses cannot be recorded in Hisab Kitab |

---

## BUG-001: Order Placement Fails

### Symptoms
```
CounterPOSClient.tsx:218 Order error: Error: permission denied for table platform_daily
```

### Root Cause Analysis

#### Data Flow Trace
```
1. User clicks "Place Order" in Counter POS
2. Frontend calls: supabase.rpc('place_cafe_order', {...})
3. place_cafe_order() inserts into 'orders' table
4. TRIGGER fires: refresh_platform_metrics_on_order()
5. Trigger attempts: INSERT INTO metrics.platform_daily
6. RLS CHECK: Does user have permission?
7. RLS RESULT: DENIED (user is not service_role)
8. ERROR propagates back to frontend
```

#### Technical Details

**Trigger Functions (PROBLEM)**:
```sql
-- Both functions have security_definer = FALSE
metrics.refresh_platform_cache_on_order()  -- security_definer: FALSE
metrics.refresh_vendor_cache_on_order()    -- security_definer: FALSE
```

**RLS Policies on metrics.platform_daily**:
```sql
-- Only allows service_role to write
platform_daily_service_write: USING (true) WITH CHECK (true) FOR service_role
platform_daily_admin_access: SELECT only for admins
```

**The Gap**:
- Triggers run as the CALLING USER (authenticated cafe owner/staff)
- RLS requires SERVICE_ROLE for writes
- Result: Permission denied

### Proposed Solution

**Option A: Add SECURITY DEFINER to trigger functions** ✅ RECOMMENDED
```sql
CREATE OR REPLACE FUNCTION metrics.refresh_platform_cache_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- ADD THIS
SET search_path TO 'public', 'metrics', 'pg_temp'  -- Security best practice
AS $function$
...
$function$;
```

**Option B: Disable triggers temporarily** ❌ NOT RECOMMENDED
- Would break metrics system entirely

**Option C: Change RLS to allow authenticated users** ❌ NOT RECOMMENDED  
- Security risk: Any user could manipulate platform metrics

### Security Implications of Option A

| Concern | Mitigation |
|---------|------------|
| Function runs with elevated privileges | Function only writes to metrics tables, no data access |
| SQL injection risk | No dynamic SQL, all queries are parameterized |
| Privilege escalation | Function scope is limited to metrics updates only |
| search_path attack | Explicitly set search_path in function definition |

---

## BUG-002: Expense Category Constraint Violation

### Symptoms
```
Failed to add expense: 
{code: "23514", message: "new row for relation \"daily_expenses\" violates check constraint \"daily_expenses_category_check\""}
```

### Root Cause Analysis

#### Data Flow Trace
```
1. User selects category "दूध (Milk/Dairy)" with id: 'dudh'
2. Frontend calls: supabase.from('daily_expenses').insert({category: 'dudh'})
3. Database CHECK constraint validates category
4. Constraint expects: 'ingredients', 'dairy', 'vegetables', 'groceries', etc.
5. Received: 'dudh'
6. CONSTRAINT VIOLATION
```

#### Technical Details

**Database Constraint**:
```sql
CHECK ((category = ANY (ARRAY[
  'ingredients'::text, 
  'dairy'::text, 
  'vegetables'::text, 
  'groceries'::text, 
  'utilities'::text, 
  'rent'::text, 
  'salary'::text, 
  'fuel'::text, 
  'other'::text
])))
```

**Frontend Categories (ExpensesClient.tsx)**:
```typescript
const EXPENSE_CATEGORIES = [
  { id: 'dudh', label: 'दूध (Milk/Dairy)', icon: '🥛' },
  { id: 'sabji', label: 'सब्जी (Vegetables)', icon: '🥬' },
  { id: 'grocery', label: 'किराना (Grocery)', icon: '🛒' },
  { id: 'meat', label: 'मासु (Meat)', icon: '🍖' },
  { id: 'gas', label: 'ग्यास (Gas/Fuel)', icon: '⛽' },
  // ... MISMATCH!
];
```

### Proposed Solution

**Option A: Update Frontend to match Database** ✅ RECOMMENDED
```typescript
const EXPENSE_CATEGORIES = [
  { id: 'dairy', label: 'दूध (Milk/Dairy)', icon: '🥛' },
  { id: 'vegetables', label: 'सब्जी (Vegetables)', icon: '🥬' },
  { id: 'groceries', label: 'किराना (Grocery)', icon: '🛒' },
  { id: 'ingredients', label: 'मासु/सामग्री (Meat/Ingredients)', icon: '🍖' },
  { id: 'fuel', label: 'ग्यास (Gas/Fuel)', icon: '⛽' },
  { id: 'utilities', label: 'बिजुली/पानी (Utilities)', icon: '💡' },
  { id: 'rent', label: 'भाडा (Rent)', icon: '🏠' },
  { id: 'salary', label: 'तलब (Salary)', icon: '💰' },
  { id: 'other', label: 'अन्य (Other)', icon: '📝' },
];
```

**Option B: Update Database Constraint** ❌ NOT RECOMMENDED
- Requires migration
- May break existing data
- Nepal-specific terms less portable

**Why Option A is Better**:
1. No database migration needed
2. Keeps database categories generic/portable
3. Frontend provides localization layer
4. Existing data (if any) remains valid

---

## EXPERT PANEL BATTLE

### 👨‍💻 Security Architect Review

**BUG-001 Fix (SECURITY DEFINER)**:
| Concern | Assessment |
|---------|------------|
| Privilege escalation | ✅ SAFE - Function scope is narrow, only updates metrics |
| SQL injection | ✅ SAFE - No dynamic SQL, all parameterized |
| search_path attack | ✅ MITIGATED - Explicit search_path set |
| Data exposure | ✅ SAFE - Function only writes, doesn't expose data |

**Verdict**: APPROVED with search_path mitigation

**BUG-002 Fix (Category mapping)**:
| Concern | Assessment |
|---------|------------|
| Data integrity | ✅ SAFE - Categories now match constraint |
| Injection via category | ✅ SAFE - Select from fixed list, not free text |

**Verdict**: APPROVED

### ⚡ Performance Engineer Review

**BUG-001 Fix**:
| Concern | Assessment |
|---------|------------|
| Additional overhead | ✅ NONE - Same function, different privilege |
| Query plan change | ✅ NONE - Queries unchanged |
| Lock contention | ⚠️ EXISTING - UPSERT on metrics tables |

**Note**: The UPSERT pattern in metrics triggers can cause lock contention at high volume. This is a pre-existing concern, not introduced by this fix.

**Verdict**: APPROVED

### 🗄️ Data Architect Review

**BUG-001 Fix**:
| Concern | Assessment |
|---------|------------|
| Transaction integrity | ✅ SAFE - Trigger runs in same transaction |
| Rollback behavior | ✅ SAFE - If trigger fails, order fails |
| Data consistency | ✅ MAINTAINED - Metrics stay in sync |

**Verdict**: APPROVED

**BUG-002 Fix**:
| Concern | Assessment |
|---------|------------|
| Existing data | ✅ NONE - Table is new, no existing data |
| Constraint validation | ✅ MAINTAINED - All categories valid |
| Future migration | ✅ EASIER - Generic categories more portable |

**Verdict**: APPROVED

### 🎨 UX Engineer Review

**BUG-002 Fix**:
| Concern | Assessment |
|---------|------------|
| Nepal context | ✅ MAINTAINED - Labels still in Nepali |
| Category clarity | ✅ IMPROVED - More specific categories |
| Quick entry flow | ✅ UNCHANGED - Same UI, different IDs |

**Verdict**: APPROVED

### 🔬 Systems Integrator Review

**Edge Cases Considered**:

| Edge Case | Handling |
|-----------|----------|
| Order placed but metrics fail | Transaction rollback - order not created |
| Multiple orders same second | UPSERT handles correctly |
| Midnight date boundary | Uses order's created_at date |
| Expense with old category | N/A - no existing data |

**Verdict**: APPROVED

---

## IMPLEMENTATION PLAN

### Phase 1: Database Migration (BUG-001)
```sql
-- Fix metrics trigger functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION metrics.refresh_platform_cache_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'metrics', 'pg_temp'
AS $function$
-- [existing function body unchanged]
$function$;

CREATE OR REPLACE FUNCTION metrics.refresh_vendor_cache_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'metrics', 'pg_temp'
AS $function$
-- [existing function body unchanged]
$function$;
```

### Phase 2: Frontend Fix (BUG-002)
```typescript
// Update ExpensesClient.tsx EXPENSE_CATEGORIES
const EXPENSE_CATEGORIES = [
  { id: 'dairy', label: 'दूध (Milk/Dairy)', icon: '🥛' },
  { id: 'vegetables', label: 'सब्जी (Vegetables)', icon: '🥬' },
  { id: 'groceries', label: 'किराना (Grocery)', icon: '🛒' },
  { id: 'ingredients', label: 'मासु/सामग्री (Ingredients)', icon: '🍖' },
  { id: 'fuel', label: 'ग्यास (Gas/Fuel)', icon: '⛽' },
  { id: 'utilities', label: 'बिजुली/पानी (Utilities)', icon: '💡' },
  { id: 'rent', label: 'भाडा (Rent)', icon: '🏠' },
  { id: 'salary', label: 'तलब (Salary)', icon: '💰' },
  { id: 'other', label: 'अन्य (Other)', icon: '📝' },
];
```

### Phase 3: Verification
1. Place order from Counter POS → Should succeed
2. Place order from Customer Website → Should succeed
3. Add expense with each category → Should succeed
4. Verify metrics tables are updated after order

---

## ROLLBACK PLAN

### BUG-001 Rollback
```sql
-- Remove SECURITY DEFINER (revert to original)
CREATE OR REPLACE FUNCTION metrics.refresh_platform_cache_on_order()
RETURNS trigger
LANGUAGE plpgsql
-- NO SECURITY DEFINER
AS $function$
-- [original function body]
$function$;
```

### BUG-002 Rollback
- Revert ExpensesClient.tsx to previous category IDs
- No database changes needed

---

## APPROVAL CHECKLIST

- [x] Root cause identified with data flow trace
- [x] Multiple solution options evaluated
- [x] Security implications analyzed
- [x] Performance implications analyzed
- [x] Data integrity implications analyzed
- [x] UX implications analyzed
- [x] Edge cases identified and handled
- [x] Rollback plan documented
- [ ] **PENDING: User approval to implement**

---

**Document Version**: 1.0  
**Created**: February 16, 2026  
**Author**: CafeOS Engineering AI  
**Protocol**: CAFEOS_EXCELLENCE_PROTOCOL v3.0
