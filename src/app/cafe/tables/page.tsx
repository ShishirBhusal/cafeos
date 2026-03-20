import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/tables');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

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
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/cafe/dashboard" className="p-2 hover:bg-stone-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-stone-900">Tables</h1>
              <p className="text-sm text-stone-500">{cafeProfile?.business_name} • Floor Plan</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <TableVisualizer
          cafeId={cafeId}
          cafeName={cafeProfile?.business_name || 'My Cafe'}
          initialTables={tables}
          floorWidth={900}
          floorHeight={600}
        />
      </main>
    </div>
  );
}
