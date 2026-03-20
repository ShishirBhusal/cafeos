# CafeOS Database Migrations

## Applied Migrations (Feb 16, 2026)

### 1. `fix_orders_user_id_nullable`
Made `user_id` and shipping columns nullable for cafe walk-in orders.

### 2. `fix_place_cafe_order_v3_complete`
Fixed `place_cafe_order()` function to include all required `order_items` columns:
- `product_id`, `product_name`, `product_slug` from product lookup
- `variant_sku` from variant lookup
- Proper `fulfillment_status` and `kitchen_status` defaults

### 3. `fix_get_kitchen_queue_function`
Fixed `get_kitchen_queue()` to use correct column names:
- Removed reference to non-existent `oi.notes`
- Uses `oi.product_name` instead

### 4. `create_mark_order_paid_function`
Created `mark_order_paid(p_order_id, p_received_by)` function:
- Updates payment_status to 'paid'
- Sets payment_received_at timestamp
- Sets order status to 'delivered'

### 5. `fix_get_daily_profit_function`
Fixed `get_daily_profit()` to use correct column names:
- Uses `o.total_cents` instead of `o.total_amount_cents`
- Uses `o.cafe_id` instead of `o.vendor_id`

## Key Database Functions

### `place_cafe_order()`
```sql
place_cafe_order(
  p_cafe_id uuid,
  p_items jsonb,  -- [{variant_id, quantity, unit_price_cents}]
  p_order_type text DEFAULT 'dine_in',
  p_table_number text,
  p_customer_name text,
  p_customer_phone text,
  p_party_size integer DEFAULT 1,
  p_notes text,
  p_payment_method text DEFAULT 'cash',
  p_is_paid boolean DEFAULT false
) RETURNS jsonb
```

### `get_kitchen_queue()`
```sql
get_kitchen_queue(p_cafe_id uuid)
RETURNS TABLE(
  ticket_id uuid,
  token_number integer,
  order_id uuid,
  status text,
  priority text,
  created_at timestamptz,
  started_at timestamptz,
  items jsonb
)
```

### `mark_order_paid()`
```sql
mark_order_paid(
  p_order_id uuid,
  p_received_by uuid
) RETURNS jsonb
```

### `get_daily_profit()`
```sql
get_daily_profit(
  p_cafe_id uuid,
  p_date date DEFAULT CURRENT_DATE
) RETURNS TABLE(
  revenue_cents bigint,
  expense_cents bigint,
  profit_cents bigint,
  order_count integer
)
```

### `generate_kitchen_token()`
```sql
generate_kitchen_token(p_cafe_id uuid)
RETURNS integer
-- Generates daily-resetting token numbers per cafe
```

## RLS Policies
- `kitchen_tickets`: Access if `cafe_id = auth.uid()` or has kitchen/counter/admin role
- `products`: Public read for active products
- `product_variants`: Public read for active variants of active products
- `orders`: Access via cafe_id or user_id matching
