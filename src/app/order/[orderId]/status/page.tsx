import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OrderStatusClient from '@/components/cafe/OrderStatusClient';

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

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderStatusPage({ params }: PageProps) {
  const { orderId } = await params;
  const supabase = await createClient();
  
  // Fetch order with kitchen ticket
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      cafe_id,
      status,
      payment_status,
      total_cents,
      table_number,
      created_at,
      order_items(
        id,
        quantity,
        kitchen_status,
        product_variants(
          sku,
          products(name)
        )
      ),
      kitchen_tickets(
        token_number,
        status
      )
    `)
    .eq('id', orderId)
    .single();
  
  if (error || !order) {
    notFound();
  }

  // Get cafe name
  const { data: cafe } = await supabase
    .from('vendor_profiles')
    .select('business_name')
    .eq('user_id', order.cafe_id)
    .single();

  return (
    <OrderStatusClient 
      order={{
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        totalCents: order.total_cents,
        tableNumber: order.table_number,
        createdAt: order.created_at,
        tokenNumber: order.kitchen_tickets?.[0]?.token_number,
        kitchenStatus: order.kitchen_tickets?.[0]?.status || 'pending',
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          name: item.product_variants?.products?.name || 'Item',
          sku: item.product_variants?.sku || '',
          quantity: item.quantity,
          kitchenStatus: item.kitchen_status,
        })),
      }}
      cafeName={cafe?.business_name || 'Cafe'}
    />
  );
}
