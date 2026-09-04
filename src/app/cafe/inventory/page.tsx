import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import InventoryClient from '@/components/cafe/InventoryClient';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import SmartReorderPanel from '@/components/cafe/SmartReorderPanel';

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

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout handles redirect

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = cafeProfile?.user_id || user.id;

  // Fetch ingredients from cafe_ingredients table
  const { data: ingredients } = await supabase
    .from('cafe_ingredients')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('is_active', true)
    .order('name');

  // Fetch stock alerts
  const { data: stockAlerts } = await supabase
    .rpc('get_stock_alerts', { p_cafe_id: cafeId });

  return (
    <CafePageLayout title="Saman Hisab" description="Inventory management">
      <div className="mb-6">
        <SmartReorderPanel />
      </div>
      <InventoryClient
        cafeId={cafeId}
        cafeName={cafeProfile?.business_name || 'My Cafe'}
        initialIngredients={ingredients || []}
        stockAlerts={stockAlerts || []}
      />
    </CafePageLayout>
  );
}
