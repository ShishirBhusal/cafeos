import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CounterPOSClient from '@/components/cafe/CounterPOSClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

export default async function CafeCounterPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/counter');
  }
  
  if (!user.capabilities.canAccessCafeCounter) {
    redirect('/');
  }

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile, error: profileError } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();
  
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[Counter] Profile error:', profileError);
  }
  
  const cafeId = cafeProfile?.user_id || user.id;
  const cafeName = cafeProfile?.business_name || 'CafeOS';
  console.log('[Counter] Cafe context - ID:', cafeId, 'Name:', cafeName, 'User:', user.id);
  
  // Fetch menu items using shared utility
  const menuItems = await getCafeMenuItems(supabase, cafeId) as MenuItem[];
  const categories = await getCategories(supabase) as Category[];
  
  console.log('[Counter] Loaded', menuItems.length, 'menu items,', categories.length, 'categories');

  return (
    <CounterPOSClient 
      cafeId={cafeId}
      cafeName={cafeProfile?.business_name || 'CafeOS'}
      menuItems={menuItems}
      categories={categories}
      userId={user.id}
    />
  );
}
