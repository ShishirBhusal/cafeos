# UF-4: Saman Hisab - Smart Inventory with Recipe Costing

**Status**: IMPLEMENTING  
**Priority**: HIGH  
**Owner Value**: Know exactly what each item costs to make

---

## Problem Statement

Nepal cafe owners track finished items (if at all). Nobody tracks INGREDIENTS: tea leaves, milk, sugar. So they don't know:
- When will I run out?
- How much does each cup of chiya ACTUALLY cost me?
- Am I pricing correctly?

## Solution

### Core Features

1. **Ingredient Management**
   - Track raw materials: tea, milk, sugar, flour, meat, vegetables
   - Units: grams, kilograms, milliliters, liters, pieces
   - Current stock with low-stock alerts
   - Cost per unit tracking

2. **Recipe Linking**
   - Link menu items to ingredients
   - Define quantity per serving (e.g., 10g tea per cup)
   - Auto-calculate food cost per item

3. **Auto-Deduction** (Future Phase)
   - When bill created, auto-deduct ingredients
   - Real-time stock updates

4. **Smart Insights**
   - Food cost percentage per item
   - Pricing recommendations
   - Days of stock remaining

---

## Database Schema

### Table: `ingredients`
```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'pcs')),
  current_stock NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `recipes`
```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  menu_item_id UUID NOT NULL REFERENCES products(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity_per_unit NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);
```

### Table: `stock_movements`
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'waste', 'adjustment')),
  quantity NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## RPC Functions

### `add_ingredient`
Creates a new ingredient for a cafe.

### `update_ingredient_stock`
Records a stock movement and updates current stock.

### `get_stock_alerts`
Returns ingredients below threshold with days remaining estimate.

### `get_menu_item_cost`
Calculates food cost for a menu item based on recipes.

### `get_all_menu_costs`
Returns food cost analysis for all menu items.

---

## UI Pages

### `/cafe/inventory` - Main Inventory Page
- List all ingredients with current stock
- Visual indicators for low stock (red/yellow/green)
- Quick add stock button
- Search and filter

### `/cafe/inventory/recipes` - Recipe Management
- Link menu items to ingredients
- Set quantity per serving
- See calculated food cost
- Margin percentage display

---

## Expert Panel Review

### Security ✅
- RLS policies ensure cafe can only see own ingredients
- Stock movements logged for audit trail

### Performance ✅
- Indexed by cafe_id for fast queries
- Denormalized current_stock for reads

### Data Integrity ✅
- Foreign keys to vendor_profiles and products
- Stock movements provide full audit trail

### UX ✅
- Simple add/update flow
- Visual stock indicators
- Mobile-friendly interface

---

## Implementation Checklist

- [ ] Database migration for ingredients, recipes, stock_movements
- [ ] RLS policies for all tables
- [ ] RPC functions for stock management
- [ ] Inventory list page
- [ ] Recipe management page
- [ ] Dashboard quick links
- [ ] Low stock alerts on dashboard
