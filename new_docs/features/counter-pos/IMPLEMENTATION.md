# Counter POS Implementation

## Overview
**BF-1 from Blueprint**: Counter Billing (POS) - Fastest in market, designed for counter-based flow

## Features Implemented
- Large tap-target buttons organized by category
- Running total always visible
- Payment mode selection (Cash, Digital)
- Dine-in/Takeaway/Delivery order types
- Table number assignment
- Customer name/phone (optional)
- Party size tracking
- Send to Kitchen (Pay Later) model

## Technical Implementation

### Page: `src/app/cafe/counter/page.tsx`
- Server component that fetches menu items
- Uses `getCafeMenuItems()` utility for consistent data fetching
- Passes data to `CounterPOSClient` component

### Component: `src/components/cafe/CounterPOSClient.tsx`
- Client component with full POS interface
- Category filtering
- Search functionality
- Cart management
- Order submission via `place_cafe_order` RPC

### Database Function: `place_cafe_order()`
Creates order with:
- Order record in `orders` table
- Order items in `order_items` table
- Kitchen ticket in `kitchen_tickets` table
- Auto-generated token number

## Order Flow
```
Counter POS → place_cafe_order() → orders + order_items + kitchen_tickets
```

## Key Design Decisions
1. **Pay Later Model**: Orders created as unpaid, customer pays when leaving
2. **Kitchen Integration**: Every order creates a kitchen ticket automatically
3. **Token System**: Daily-resetting token numbers for easy order tracking

## Speed Target
- Complete a 3-item bill in under 8 seconds
- One tap = add item
- Minimal required fields

## Files Changed
- `src/app/cafe/counter/page.tsx`
- `src/components/cafe/CounterPOSClient.tsx`
- `src/lib/cafe-context.ts` (shared utility)
