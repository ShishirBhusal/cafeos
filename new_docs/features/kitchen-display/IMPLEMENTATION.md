# Kitchen Display Implementation

## Overview
**BF-11 from Blueprint**: Kitchen Display System (KDS)

## Features Implemented
- Real-time order queue with Supabase Realtime
- Color-coded by age (green → yellow → orange → red)
- Token number display
- Item list with quantities
- Status updates (pending → preparing → ready → served)
- Audio notifications for new orders
- Fullscreen mode

## Technical Implementation

### Page: `src/app/cafe/kitchen/page.tsx`
- Server component fetching initial queue
- Uses `get_kitchen_queue()` RPC function

### Component: `src/components/cafe/KitchenDisplayClient.tsx`
- Client component with Realtime subscriptions
- Auto-refresh every 30 seconds
- Sound notifications
- Status color coding based on wait time

### Database Function: `get_kitchen_queue()`
Returns pending/preparing tickets with:
- Token number
- Order items (name, quantity, kitchen_status)
- Created timestamp
- Priority level

## Kitchen Ticket Statuses
1. **pending** - Order received, waiting to start
2. **preparing** - Cook has started
3. **ready** - Food ready for serving
4. **served** - Delivered to customer

## Wait Time Color Coding
- Green: < 5 minutes
- Yellow: 5-10 minutes
- Orange: 10-15 minutes
- Red: > 15 minutes (urgent)

## Real-time Updates
```typescript
supabase.channel('kitchen-tickets')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'kitchen_tickets',
    filter: `cafe_id=eq.${cafeId}`
  }, handleChange)
  .subscribe()
```

## Files
- `src/app/cafe/kitchen/page.tsx`
- `src/components/cafe/KitchenDisplayClient.tsx`
