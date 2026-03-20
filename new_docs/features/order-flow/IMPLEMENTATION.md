# CafeOS Order Flow Implementation

## Overview
Complete order flow from customer/counter to kitchen to payment.

## Database Functions

### `place_cafe_order()`
Creates a cafe order with kitchen ticket.

**Parameters:**
- `p_cafe_id` (uuid) - Cafe's vendor ID
- `p_items` (jsonb) - Array of `{variant_id, quantity, unit_price_cents}`
- `p_order_type` (text) - 'dine_in', 'takeaway', 'delivery'
- `p_table_number` (text) - Optional table number
- `p_customer_name` (text) - Optional customer name
- `p_customer_phone` (text) - Optional phone
- `p_party_size` (int) - Number of guests
- `p_notes` (text) - Special instructions
- `p_payment_method` (text) - 'cash', 'esewa', 'khalti'
- `p_is_paid` (boolean) - false = pay later model

**Returns:**
```json
{
  "success": true,
  "order_id": "uuid",
  "order_number": "CAFE-20260216-0001",
  "ticket_id": "uuid",
  "token_number": 1,
  "total_cents": 8000,
  "payment_status": "unpaid"
}
```

### `generate_kitchen_token()`
Generates daily-resetting token numbers per cafe.

### `mark_order_paid()`
Marks order as paid when customer settles bill.

## Database Schema Changes

### Migration: `fix_orders_user_id_nullable`
- Made `user_id` nullable for walk-in customers
- Made shipping fields nullable for cafe orders

### Migration: `fix_place_cafe_order_v3_complete`
- Fixed function to include all required `order_items` columns
- Joins `product_variants` and `products` to get names/slugs

## Order Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Customer  │───▶│   Counter   │───▶│   Kitchen   │
│  QR Order   │    │   POS       │    │   Display   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                 │                   │
       └────────┬────────┘                   │
                ▼                            ▼
         ┌─────────────┐            ┌─────────────┐
         │   orders    │───────────▶│  kitchen_   │
         │   table     │            │  tickets    │
         └─────────────┘            └─────────────┘
                │
                ▼
         ┌─────────────┐
         │ order_items │
         └─────────────┘
```

## Key Points

1. **Pay Later Model**: Orders created with `payment_status = 'unpaid'`
2. **Walk-in Support**: `user_id` is nullable for customers without accounts
3. **Kitchen Tokens**: Reset daily per cafe, sequential numbering
4. **Real-time Updates**: Kitchen display uses Supabase Realtime

## Testing

```sql
-- Test order creation
SELECT place_cafe_order(
  'cafe-uuid'::uuid,
  '[{"variant_id": "variant-uuid", "quantity": 2, "unit_price_cents": 4000}]'::jsonb,
  'dine_in', '5', 'Customer Name', '9841234567', 2, 'No sugar', 'cash', false
);

-- Check kitchen queue
SELECT * FROM kitchen_tickets WHERE cafe_id = 'cafe-uuid' ORDER BY created_at DESC;

-- Mark as paid
SELECT mark_order_paid('order-uuid', 'staff-uuid');
```

## Verified Working: Feb 16, 2026
- Order creation ✓
- Kitchen ticket creation ✓
- Token number generation ✓
- Order items with product details ✓
