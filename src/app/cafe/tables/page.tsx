import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import TableVisualizer from '@/components/cafe/TableVisualizer';

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

export default async function TablesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = cafeProfile?.user_id || user.id;

  // Fetch tables with current orders using RPC
  const { data: tablesData } = await supabase.rpc('get_cafe_tables_with_orders', {
    p_cafe_id: cafeId
  });

  // Transform to expected format
  const tables = (tablesData || []).map((t: any) => ({
    id: t.id,
    table_number: t.table_number,
    capacity: t.capacity,
    position_x: t.position_x,
    position_y: t.position_y,
    shape: t.shape as 'round' | 'square' | 'rectangle',
    status: t.status as 'available' | 'occupied' | 'reserved' | 'cleaning',
    current_order: t.current_order ? {
      id: t.current_order.id,
      order_number: t.current_order.order_number,
      total_cents: t.current_order.total_cents,
      payment_status: t.current_order.payment_status,
      kitchen_status: t.current_order.kitchen_status,
      created_at: t.current_order.created_at,
      items_count: t.current_order.items_count,
    } : null,
  }));

  return (
    <CafePageLayout title="Tables" description="Manage seating layout" fullWidth>
      <TableVisualizer
        cafeId={cafeId}
        cafeName={cafeProfile?.business_name || 'My Cafe'}
        initialTables={tables}
        floorWidth={900}
        floorHeight={600}
      />
    </CafePageLayout>
  );
}
