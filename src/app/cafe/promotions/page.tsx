import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus,
  Clock,
  Percent,
  Gift,
  Tag,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  Zap
} from 'lucide-react';
import PromotionsClient from '@/components/cafe/PromotionsClient';

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
            // Ignore
          }
        },
      },
    }
  );
}

export default async function PromotionsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/promotions');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = cafeProfile?.user_id || user.id;

  // Fetch promotions
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });

  // Fetch menu items for combo selection
  const { data: menuItems } = await supabase
    .from('products')
    .select('id, name, price_cents, category_id, categories(name)')
    .eq('vendor_id', cafeId)
    .eq('is_active', true)
    .order('name');

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('vendor_id', cafeId)
    .order('name');

  return (
    <PromotionsClient
      cafeId={cafeId}
      cafeName={cafeProfile?.business_name || 'My Cafe'}
      initialPromotions={promotions || []}
      menuItems={menuItems || []}
      categories={categories || []}
    />
  );
}
