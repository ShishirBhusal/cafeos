import { SupabaseClient } from '@supabase/supabase-js';

export interface CafeContext {
  cafeId: string;
  cafeName: string;
  isOwner: boolean;
  isStaff: boolean;
}

/**
 * Resolves the cafe context for the current user.
 * Handles both cafe owners and staff members.
 */
export async function getCafeContext(
  supabase: SupabaseClient,
  userId: string
): Promise<CafeContext | null> {
  // First, check if user owns a cafe
  const { data: ownedCafe, error: ownerError } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', userId)
    .single();

  if (ownedCafe) {
    console.log('[CafeContext] User owns cafe:', ownedCafe.business_name);
    return {
      cafeId: ownedCafe.user_id,
      cafeName: ownedCafe.business_name,
      isOwner: true,
      isStaff: false,
    };
  }

  // If not an owner, check if user is staff at a cafe
  const { data: staffAssignment } = await supabase
    .from('staff_assignments')
    .select('cafe_id, vendor_profiles(user_id, business_name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (staffAssignment && staffAssignment.vendor_profiles) {
    const vendorProfile = staffAssignment.vendor_profiles as any;
    console.log('[CafeContext] User is staff at:', vendorProfile.business_name);
    return {
      cafeId: staffAssignment.cafe_id,
      cafeName: vendorProfile.business_name,
      isOwner: false,
      isStaff: true,
    };
  }

  console.log('[CafeContext] No cafe found for user:', userId);
  return null;
}

/**
 * Fetches menu items for a cafe with proper error handling.
 */
export async function getCafeMenuItems(
  supabase: SupabaseClient,
  cafeId: string
) {
  console.log('[CafeMenu] Fetching menu for cafe:', cafeId);
  
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      category_id,
      categories(id, name, slug),
      product_variants(id, sku, price, is_active),
      product_images(image_url, sort_order)
    `)
    .eq('vendor_id', cafeId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('[CafeMenu] Error fetching products:', error);
    return [];
  }

  console.log('[CafeMenu] Found', products?.length || 0, 'products');

  // Transform to menu items
  return (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    category_id: p.category_id,
    category_name: (p.categories as any)?.name || 'Uncategorized',
    variants: (p.product_variants || [])
      .filter((v: any) => v.is_active !== false)
      .map((v: any) => ({
        id: v.id,
        sku: v.sku,
        price_cents: Math.round((v.price || 0) * 100),
      })),
    image_url: p.product_images?.[0]?.image_url || null,
  }));
}

/**
 * Gets all categories
 */
export async function getCategories(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name');
  
  return data || [];
}
