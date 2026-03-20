-- UF-4: Saman Hisab - Smart Inventory with Recipe Costing
-- Migration: Create ingredients, recipes, and stock_movements tables

-- ============================================
-- TABLE: ingredients
-- Tracks raw materials for each cafe
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_nepali TEXT,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'L', 'pcs')),
  current_stock NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit INTEGER NOT NULL DEFAULT 0, -- in paisa (cents)
  supplier_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast cafe-specific queries
CREATE INDEX IF NOT EXISTS idx_ingredients_cafe_id ON ingredients(cafe_id);

-- ============================================
-- TABLE: recipes
-- Links menu items to their ingredient requirements
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_per_unit NUMERIC NOT NULL, -- amount of ingredient per 1 serving
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

-- Indexes for recipe lookups
CREATE INDEX IF NOT EXISTS idx_recipes_cafe_id ON recipes(cafe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);

-- ============================================
-- TABLE: stock_movements
-- Audit trail for all inventory changes
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'waste', 'adjustment')),
  quantity NUMERIC NOT NULL, -- positive for additions, negative for reductions
  cost_cents INTEGER, -- cost for purchases
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for movement history
CREATE INDEX IF NOT EXISTS idx_stock_movements_cafe ON stock_movements(cafe_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);

-- ============================================
-- TABLE: promotions
-- Smart promotions: happy hour, combos, discounts
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('happy_hour', 'combo', 'discount', 'buy_x_get_y')),
  is_active BOOLEAN DEFAULT true,
  
  -- Time-based rules (for happy hour)
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
  
  -- Discount rules
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER, -- percentage (0-100) or fixed amount in paisa
  
  -- Combo rules (stored as JSONB)
  combo_items JSONB, -- [{menu_item_id, quantity}]
  combo_price_cents INTEGER,
  
  -- Buy X Get Y rules
  buy_quantity INTEGER,
  get_quantity INTEGER,
  applies_to JSONB, -- menu item IDs or category IDs
  
  -- Validity
  valid_from DATE,
  valid_until DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_cafe ON promotions(cafe_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(cafe_id, is_active) WHERE is_active = true;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Ingredients: Cafe owners and staff can manage
CREATE POLICY ingredients_cafe_access ON ingredients
  FOR ALL USING (
    cafe_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('counter', 'admin', 'cafe_manager')
    )
  );

-- Recipes: Cafe owners and managers can manage
CREATE POLICY recipes_cafe_access ON recipes
  FOR ALL USING (
    cafe_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'cafe_manager')
    )
  );

-- Stock movements: Cafe access for audit
CREATE POLICY stock_movements_cafe_access ON stock_movements
  FOR ALL USING (
    cafe_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('counter', 'admin', 'cafe_manager')
    )
  );

-- Promotions: Cafe owners and managers
CREATE POLICY promotions_cafe_access ON promotions
  FOR ALL USING (
    cafe_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'cafe_manager')
    )
  );

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Add or update ingredient stock
CREATE OR REPLACE FUNCTION add_ingredient_stock(
  p_cafe_id UUID,
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_cost_cents INTEGER DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_stock NUMERIC;
BEGIN
  -- Update current stock
  UPDATE ingredients
  SET 
    current_stock = current_stock + p_quantity,
    updated_at = now()
  WHERE id = p_ingredient_id AND cafe_id = p_cafe_id
  RETURNING current_stock INTO v_new_stock;
  
  IF v_new_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ingredient not found');
  END IF;
  
  -- Record movement
  INSERT INTO stock_movements (cafe_id, ingredient_id, type, quantity, cost_cents, note, created_by)
  VALUES (p_cafe_id, p_ingredient_id, 'purchase', p_quantity, p_cost_cents, p_note, auth.uid());
  
  RETURN jsonb_build_object(
    'success', true,
    'new_stock', v_new_stock
  );
END;
$$;

-- Get low stock alerts
CREATE OR REPLACE FUNCTION get_stock_alerts(p_cafe_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  unit TEXT,
  current_stock NUMERIC,
  low_stock_threshold NUMERIC,
  days_remaining NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.unit,
    i.current_stock,
    i.low_stock_threshold,
    -- Estimate days remaining based on last 7 days usage
    CASE 
      WHEN COALESCE(daily_usage.avg_daily, 0) > 0 
      THEN ROUND(i.current_stock / daily_usage.avg_daily, 1)
      ELSE 999
    END as days_remaining,
    CASE
      WHEN i.current_stock <= 0 THEN 'out_of_stock'
      WHEN i.current_stock <= i.low_stock_threshold THEN 'critical'
      WHEN i.current_stock <= i.low_stock_threshold * 2 THEN 'warning'
      ELSE 'ok'
    END as status
  FROM ingredients i
  LEFT JOIN LATERAL (
    SELECT ABS(SUM(sm.quantity)) / 7.0 as avg_daily
    FROM stock_movements sm
    WHERE sm.ingredient_id = i.id
    AND sm.type = 'usage'
    AND sm.created_at >= now() - interval '7 days'
  ) daily_usage ON true
  WHERE i.cafe_id = p_cafe_id
  AND (i.current_stock <= i.low_stock_threshold * 2 OR i.current_stock <= 0)
  ORDER BY 
    CASE
      WHEN i.current_stock <= 0 THEN 0
      WHEN i.current_stock <= i.low_stock_threshold THEN 1
      ELSE 2
    END,
    days_remaining ASC;
END;
$$;

-- Calculate menu item cost from recipes
CREATE OR REPLACE FUNCTION get_menu_item_cost(p_menu_item_id UUID)
RETURNS TABLE (
  menu_item_id UUID,
  total_cost_cents INTEGER,
  ingredients JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_menu_item_id,
    COALESCE(SUM((r.quantity_per_unit * i.cost_per_unit)::INTEGER), 0) as total_cost_cents,
    jsonb_agg(jsonb_build_object(
      'name', i.name,
      'quantity', r.quantity_per_unit,
      'unit', i.unit,
      'cost_cents', (r.quantity_per_unit * i.cost_per_unit)::INTEGER
    )) as ingredients
  FROM recipes r
  JOIN ingredients i ON r.ingredient_id = i.id
  WHERE r.menu_item_id = p_menu_item_id
  GROUP BY r.menu_item_id;
END;
$$;

-- Get all menu items with food cost analysis
CREATE OR REPLACE FUNCTION get_menu_cost_analysis(p_cafe_id UUID)
RETURNS TABLE (
  menu_item_id UUID,
  item_name TEXT,
  sell_price_cents INTEGER,
  food_cost_cents INTEGER,
  margin_cents INTEGER,
  margin_percentage NUMERIC,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as menu_item_id,
    p.name as item_name,
    p.price_cents as sell_price_cents,
    COALESCE(recipe_cost.total_cost, 0)::INTEGER as food_cost_cents,
    (p.price_cents - COALESCE(recipe_cost.total_cost, 0))::INTEGER as margin_cents,
    CASE 
      WHEN p.price_cents > 0 
      THEN ROUND(((p.price_cents - COALESCE(recipe_cost.total_cost, 0))::NUMERIC / p.price_cents) * 100, 1)
      ELSE 0
    END as margin_percentage,
    COALESCE(c.name, 'Uncategorized') as category
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN LATERAL (
    SELECT SUM(r.quantity_per_unit * i.cost_per_unit) as total_cost
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.menu_item_id = p.id
  ) recipe_cost ON true
  WHERE p.vendor_id = p_cafe_id
  AND p.is_active = true
  ORDER BY margin_percentage DESC;
END;
$$;

-- Get active promotions for current time
CREATE OR REPLACE FUNCTION get_active_promotions(p_cafe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_time TIME := LOCALTIME;
  v_current_day INTEGER := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
  v_current_date DATE := CURRENT_DATE;
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'type', p.type,
      'discount_type', p.discount_type,
      'discount_value', p.discount_value,
      'combo_items', p.combo_items,
      'combo_price_cents', p.combo_price_cents,
      'buy_quantity', p.buy_quantity,
      'get_quantity', p.get_quantity,
      'applies_to', p.applies_to
    ))
    FROM promotions p
    WHERE p.cafe_id = p_cafe_id
    AND p.is_active = true
    AND (p.valid_from IS NULL OR p.valid_from <= v_current_date)
    AND (p.valid_until IS NULL OR p.valid_until >= v_current_date)
    AND (
      p.type != 'happy_hour' 
      OR (
        p.start_time <= v_current_time 
        AND p.end_time >= v_current_time
        AND (p.days_of_week IS NULL OR v_current_day = ANY(p.days_of_week))
      )
    )
  );
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
