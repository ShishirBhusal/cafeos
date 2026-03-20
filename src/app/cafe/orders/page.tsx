import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { formatRs } from '@/lib/formatRs';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  ChefHat,
  Banknote,
  Smartphone,
  Users,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  Eye,
  Printer,
  RefreshCw,
  Calendar,
  MapPin
} from 'lucide-react';
import OrdersClient from '@/components/cafe/OrdersClient';
import { getNepaliDateString, nepalDateToUTCRange } from '@/lib/nepalTime';

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
  searchParams: Promise<{ 
    status?: string; 
    payment?: string;
    date?: string;
  }>;
}

export default async function CafeOrdersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/orders');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const { status, payment, date } = await searchParams;
  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();
  
  const cafeId = cafeProfile?.user_id || user.id;

  // Build query
  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      payment_status,
      payment_method,
      total_cents,
      table_number,
      order_type,
      primary_customer_name,
      source,
      created_at,
      kitchen_tickets(token_number, status)
    `)
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false })
    .limit(30); // Initial load - client handles pagination

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (payment) {
    query = query.eq('payment_status', payment);
  }
  if (date) {
    // Convert Nepal date to UTC range for database query
    const { start, end } = nepalDateToUTCRange(date);
    query = query.gte('created_at', start).lte('created_at', end);
  }

  const { data: orders, error } = await query;

  // Calculate stats for today (Nepal time)
  const todayStr = getNepaliDateString();
  const { start: todayStart, end: todayEnd } = nepalDateToUTCRange(todayStr);
  const todayOrders = orders?.filter(o => {
    const orderTime = new Date(o.created_at).getTime();
    return orderTime >= new Date(todayStart).getTime() && orderTime <= new Date(todayEnd).getTime();
  }) || [];

  const stats = {
    totalOrders: todayOrders.length,
    paidCount: todayOrders.filter(o => o.payment_status === 'paid').length,
    unpaidCount: todayOrders.filter(o => o.payment_status === 'unpaid').length,
    paidAmount: todayOrders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_cents || 0), 0),
    unpaidAmount: todayOrders
      .filter(o => o.payment_status === 'unpaid')
      .reduce((sum, o) => sum + (o.total_cents || 0), 0),
    cashAmount: todayOrders
      .filter(o => o.payment_status === 'paid' && o.payment_method === 'cash')
      .reduce((sum, o) => sum + (o.total_cents || 0), 0),
    digitalAmount: todayOrders
      .filter(o => o.payment_status === 'paid' && o.payment_method !== 'cash')
      .reduce((sum, o) => sum + (o.total_cents || 0), 0),
  };

  return (
    <OrdersClient
      cafeId={cafeId}
      cafeName={cafeProfile?.business_name || 'My Cafe'}
      initialOrders={(orders || []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        payment_status: o.payment_status,
        payment_method: o.payment_method || null,
        total_cents: o.total_cents,
        table_number: o.table_number,
        order_type: o.order_type,
        primary_customer_name: o.primary_customer_name,
        source: o.source || null,
        created_at: o.created_at,
        kitchen_tickets: o.kitchen_tickets || [],
      }))}
      initialStats={stats}
      initialFilter={{ payment, status, date }}
    />
  );
}
