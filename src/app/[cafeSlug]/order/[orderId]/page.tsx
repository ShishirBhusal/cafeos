import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OrderTrackingClient from '@/components/cafe/OrderTrackingClient';

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
  params: Promise<{ cafeSlug: string; orderId: string }>;
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { cafeSlug, orderId } = await params;
  const supabase = await createClient();
  
  // Find cafe by slug
  const { data: allCafes } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('verification_status', 'verified');
  
  const cafe = allCafes?.find(c => 
    c.business_name.toLowerCase().replace(/\s+/g, '-') === cafeSlug.toLowerCase()
  );
  
  if (!cafe) {
    notFound();
  }

  // Fetch order with kitchen ticket
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_cents,
      payment_status,
      table_number,
      created_at,
      kitchen_tickets (
        id,
        token_number,
        status,
        prep_started_at,
        completed_at
      )
    `)
    .eq('id', orderId)
    .eq('cafe_id', cafe.user_id)
    .single();

  if (!order) {
    notFound();
  }

  const ticket = order.kitchen_tickets?.[0] || null;

  return (
    <OrderTrackingClient
      cafeId={cafe.user_id}
      cafeName={cafe.business_name}
      cafeSlug={cafeSlug}
      order={{
        id: order.id,
        orderNumber: order.order_number,
        totalCents: order.total_cents,
        paymentStatus: order.payment_status,
        tableNumber: order.table_number,
        createdAt: order.created_at,
      }}
      ticket={ticket ? {
        id: ticket.id,
        tokenNumber: ticket.token_number,
        status: ticket.status,
        prepStartedAt: ticket.prep_started_at,
        completedAt: ticket.completed_at,
      } : null}
    />
  );
}
