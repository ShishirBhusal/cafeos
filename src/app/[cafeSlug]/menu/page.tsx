import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CustomerMenuClient from '@/components/cafe/CustomerMenuClient';
import { getCafeMenuItems, getCategories } from '@/lib/cafe-context';

export const dynamic = 'force-dynamic';

async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - Server Component limitation
          }
        },
      },
    }
  );
}

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string;
  category_name: string;
  variants: {
    id: string;
    sku: string;
    price_cents: number;
  }[];
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PageProps {
  params: Promise<{ cafeSlug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function CustomerMenuPage({ params, searchParams }: PageProps) {
  const { cafeSlug } = await params;
  const { table } = await searchParams;
  
  const supabase = await createClient();
  
  // Find cafe by slug (business_name slugified or explicit slug)
  // For now, we'll search by business_name converted to slug format
  const { data: cafeProfile, error: cafeError } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .ilike('business_name', cafeSlug.replace(/-/g, ' ').replace(/%20/g, ' '))
    .single();
  
  // Fallback: try exact match on slugified business name
  if (!cafeProfile) {
    const { data: allCafes } = await supabase
      .from('vendor_profiles')
      .select('user_id, business_name')
      .eq('verification_status', 'verified');
    
    const matchedCafe = allCafes?.find(cafe => 
      cafe.business_name.toLowerCase().replace(/\s+/g, '-') === cafeSlug.toLowerCase()
    );
    
    if (!matchedCafe) {
      notFound();
    }
    
    // Use matched cafe
    const cafeId = matchedCafe.user_id;
    const cafeName = matchedCafe.business_name;
    
    return renderMenuPage(supabase, cafeId, cafeName, table);
  }
  
  return renderMenuPage(supabase, cafeProfile.user_id, cafeProfile.business_name, table);
}

async function renderMenuPage(
  supabase: any, 
  cafeId: string, 
  cafeName: string, 
  tableNumber?: string
) {
  console.log('[CustomerMenu] Rendering menu for cafe:', cafeName, 'ID:', cafeId);
  
  // Fetch menu items using shared utility
  const menuItems = await getCafeMenuItems(supabase, cafeId) as MenuItem[];
  const allCategories = await getCategories(supabase);
  
  // Filter to only categories that have items
  const activeCategories: Category[] = allCategories.filter((cat: Category) =>
    menuItems.some(item => item.category_id === cat.id)
  );
  
  console.log('[CustomerMenu] Loaded', menuItems.length, 'items,', activeCategories.length, 'categories');

  return (
    <CustomerMenuClient 
      cafeId={cafeId}
      cafeName={cafeName}
      menuItems={menuItems}
      categories={activeCategories}
      tableNumber={tableNumber}
    />
  );
}
