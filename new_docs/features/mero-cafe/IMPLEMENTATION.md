# Mero Cafe - Digital Presence for Every Cafe

## Overview
**UF-3 from Blueprint**: Automatic Microsite + Digital Presence for Every Cafe

Each cafe on CafeOS gets a professional website at:
- Website: `cafeos.com.np/cafe-name` 
- Menu: `cafeos.com.np/cafe-name/menu`

## Implementation

### Routes Created
- `src/app/[cafeSlug]/page.tsx` - Cafe website/microsite
- `src/app/[cafeSlug]/menu/page.tsx` - Customer-facing menu

### Features
1. **Hero Section** with gradient orange theme
2. **Cafe Info** - name, rating, item count
3. **Quick Info Cards** - hours, contact, location
4. **Category Listing** - clickable categories
5. **Featured Items** - top 3 menu items with images
6. **CTA Section** - drives to full menu
7. **Footer** - contact info, powered by CafeOS

### URL Generation
```typescript
const getSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
```

### Explore Page Integration
Updated `src/app/explore/page.tsx` with two buttons:
- **Website** - links to `/{slug}`
- **Menu** - links to `/{slug}/menu`

## Cafe Filtering
Cafes shown on Explore page must have:
- `verification_status = 'verified'`
- `business_type` containing: cafe, restaurant, tea, coffee, chiya

## Database Queries
```sql
-- Cafe lookup by slug
SELECT user_id, business_name, contact_email, contact_phone,
       business_addresses(address_line1, city, state)
FROM vendor_profiles
WHERE verification_status = 'verified'
-- Then match business_name slugified to URL slug
```

## Value Delivered
- Free digital presence for every cafe
- SEO-friendly URLs
- Shareable menu links
- Professional appearance for small businesses
- No additional cost to cafe owners

## Screenshots
- Hero with gradient and cafe branding
- Quick info cards (hours, contact, location)
- Popular items grid
- Full menu page with categories and search

## Future Enhancements
- QR code generation (printable PDF)
- Google Maps integration
- Customer reviews
- Daily specials section
- Share buttons (WhatsApp, Facebook)
