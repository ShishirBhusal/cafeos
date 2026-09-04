import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { formatRs } from '@/lib/formatRs';
import { getNepaliDayName, getNepaliHour, getNepaliDateString, nepalDateToUTCRange, getGreeting } from '@/lib/nepalTime';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  BookOpen,
  AlertTriangle,
  Package,
} from 'lucide-react';
import DecisionFeedClient from '@/components/cafe/DecisionFeedClient';
import { getCurrentUser } from '@/lib/auth';

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

export default async function CafeDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout handles redirect

  const supabase = await createClient();
  const cafeId = user.id;

  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name, contact_name')
    .eq('user_id', cafeId)
    .single();

  const ownerName = cafeProfile?.contact_name || cafeProfile?.business_name || 'there';

  // Parallel data fetching
  const [
    { data: dailyProfit },
    { count: pendingTickets },
    { data: recentOrders },
    { data: dailyStory },
    { count: uniqueCustomersToday },
  ] = await Promise.all([
    supabase.rpc('get_daily_profit_detailed', { p_cafe_id: cafeId }),
    supabase
      .from('kitchen_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .in('status', ['pending', 'preparing']),
    supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_cents,
        payment_status,
        payment_method,
        primary_customer_name,
        table_number,
        created_at,
        kitchen_tickets(token_number, status)
      `)
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.rpc('get_daily_story', { p_cafe_id: cafeId }),
    supabase
      .from('orders')
      .select('primary_customer_phone', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .gte('created_at', nepalDateToUTCRange(getNepaliDateString()).start)
      .not('primary_customer_phone', 'is', null),
  ]);

  // Fetch stock alerts properly (items where current_stock <= min_stock_level)
  const { data: lowStockItems } = await supabase
    .from('cafe_ingredients')
    .select('id, name, current_stock, min_stock_level, unit')
    .eq('cafe_id', cafeId)
    .not('min_stock_level', 'is', null)
    .order('current_stock', { ascending: true })
    .limit(10);

  const actualLowStock = (lowStockItems || []).filter(
    (item: any) => item.current_stock <= (item.min_stock_level || 0)
  );

  const story = dailyStory as any;

  // Format values
  const profitData = dailyProfit as { revenue_cents: number; expense_cents: number; fixed_cost_share_cents: number; profit_cents: number; order_count: number; unpaid_cents: number; unpaid_count: number } | null;
  const revenueCents = profitData?.revenue_cents || 0;
  const profitCents = profitData?.profit_cents || 0;
  const expenseCents = (profitData?.expense_cents || 0) + (profitData?.fixed_cost_share_cents || 0);
  const todayOrders = profitData?.order_count || 0;
  const unpaidCents = profitData?.unpaid_cents || 0;
  const unpaidCount = profitData?.unpaid_count || 0;

  // AOV
  const aov = todayOrders > 0 ? Math.round(revenueCents / todayOrders) : 0;

  // Trends from daily story
  const comparison = story?.comparison;
  const avgRevenue = comparison?.vs_30day_avg_revenue || 0;
  const revenueTrend = avgRevenue > 0 && revenueCents > 0
    ? { direction: revenueCents >= avgRevenue ? 'up' as const : 'down' as const,
        label: `${Math.abs(Math.round(((revenueCents - avgRevenue) / avgRevenue) * 100))}% vs 30d avg` }
    : undefined;

  const greeting = getGreeting();
  const nepaliDay = getNepaliDayName();

  // Smart nudge
  const hour = getNepaliHour();
  const isMorning = hour >= 4 && hour < 12;
  const isClosingTime = hour >= 20 || hour < 4;

  const getSmartNudge = () => {
    if (isClosingTime && (unpaidCount || 0) > 0)
      return { text: `${unpaidCount} unpaid orders — collect before closing`, urgent: true };
    if (isClosingTime)
      return { text: 'Ready to close? Review your daily summary below', urgent: false };
    if (isMorning && todayOrders === 0)
      return { text: 'Open the counter to start taking orders', urgent: false };
    if ((pendingTickets || 0) >= 3)
      return { text: `${pendingTickets} orders waiting in kitchen`, urgent: true };
    if (actualLowStock.length > 0)
      return { text: `${actualLowStock.length} ingredient${actualLowStock.length > 1 ? 's' : ''} running low`, urgent: actualLowStock.length >= 3 };
    if ((unpaidCount || 0) > 0)
      return { text: `${formatRs(unpaidCents)} pending collection`, urgent: false };
    return null;
  };
  const smartNudge = getSmartNudge();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-stone-500">{greeting}, {ownerName}</p>
              <p className="text-xs text-stone-400 mt-0.5">{nepaliDay}</p>
            </div>
            <Link
              href="/cafe/counter"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Open Counter
            </Link>
          </div>

          {/* Profit number */}
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              {todayOrders > 0 ? "Today's profit" : 'Today'}
            </p>
            {todayOrders > 0 ? (
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-4xl font-bold tabular-nums ${profitCents >= 0 ? 'text-stone-900' : 'text-rose-600'}`}>
                  {formatRs(profitCents)}
                </span>
                {revenueTrend && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    revenueTrend.direction === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {revenueTrend.direction === 'up' ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {revenueTrend.label}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-2xl font-bold text-stone-900 mt-1">No orders yet</p>
            )}
            <p className="text-sm text-stone-500 mt-1">
              {todayOrders > 0
                ? `${todayOrders} orders · ${formatRs(revenueCents)} revenue · ${formatRs(expenseCents)} expenses`
                : 'Open the counter to start your day'
              }
            </p>
          </div>

          {/* Smart nudge */}
          {smartNudge && (
            <div className={`mt-4 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
              smartNudge.urgent ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-stone-50 text-stone-600 border border-stone-200'
            }`}>
              {smartNudge.urgent && <Zap className="w-3.5 h-3.5 inline mr-1.5" />}
              {smartNudge.text}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-5 space-y-4">

        {/* Quick metrics */}
        {todayOrders > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <span className="text-xs font-medium text-stone-400">Revenue</span>
              <p className="text-xl font-bold text-stone-900 tabular-nums mt-1">{formatRs(revenueCents)}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <span className="text-xs font-medium text-stone-400">Orders</span>
              <p className="text-xl font-bold text-stone-900 tabular-nums mt-1">{todayOrders}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <span className="text-xs font-medium text-stone-400">Avg. order</span>
              <p className="text-xl font-bold text-stone-900 tabular-nums mt-1">{formatRs(aov)}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <span className="text-xs font-medium text-stone-400">Customers</span>
              <p className="text-xl font-bold text-stone-900 tabular-nums mt-1">{uniqueCustomersToday || 0}</p>
            </div>
          </div>
        )}

        {/* ═══ DECISION FEED - The Brain ═══ */}
        <DecisionFeedClient cafeId={cafeId} compact={true} />

        {/* Stock alerts */}
        {actualLowStock.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-stone-400" />
                Low stock
              </h3>
              <Link href="/cafe/inventory" className="text-xs text-stone-500 font-medium hover:text-stone-700">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {actualLowStock.slice(0, 5).map((item: any) => {
                const pct = item.min_stock_level > 0
                  ? Math.round((item.current_stock / item.min_stock_level) * 100)
                  : 0;
                const isUrgent = pct <= 25;
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Package className={`w-4 h-4 flex-shrink-0 ${isUrgent ? 'text-rose-500' : 'text-stone-400'}`} />
                      <span className="text-sm font-medium text-stone-700 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isUrgent ? 'bg-rose-500' : 'bg-stone-400'}`}
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isUrgent ? 'text-rose-600' : 'text-stone-500'}`}>
                        {item.current_stock} {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's story */}
        {story && story.total_orders > 0 && (
          <Link href="/cafe/story" className="block">
            <div className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-stone-400" />
                  Today&apos;s summary
                </h3>
                <Link
                  href="/cafe/story/weekly"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-stone-500 font-medium hover:text-stone-700"
                >
                  This week
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-stone-900 tabular-nums">{story.total_orders}</p>
                  <p className="text-xs text-stone-500">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900 tabular-nums">{formatRs(story.total_revenue_cents || 0)}</p>
                  <p className="text-xs text-stone-500">Revenue</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{story.top_item?.name || '—'}</p>
                  <p className="text-xs text-stone-500">Top item</p>
                </div>
              </div>
              {story.insights && story.insights.length > 0 && (
                <p className="text-sm text-stone-500 mt-3 pt-3 border-t border-stone-100">
                  {story.insights[0]}
                </p>
              )}
            </div>
          </Link>
        )}

        {/* Profit breakdown */}
        {todayOrders > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-900 text-sm mb-3">Daily breakdown</h3>
            <div className="space-y-0.5">
              <div className="flex justify-between py-2.5 text-sm">
                <span className="text-stone-500">Revenue</span>
                <span className="font-semibold text-emerald-700 tabular-nums">+{formatRs(revenueCents)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-sm border-b border-stone-100">
                <span className="text-stone-500">Expenses</span>
                <span className="font-semibold text-rose-600 tabular-nums">-{formatRs(expenseCents)}</span>
              </div>
              {unpaidCount > 0 && (
                <div className="flex justify-between py-2.5 text-sm border-b border-stone-100">
                  <span className="text-stone-500">Unpaid ({unpaidCount})</span>
                  <span className="font-semibold text-stone-500 tabular-nums">{formatRs(unpaidCents)}</span>
                </div>
              )}
              <div className="flex justify-between py-3">
                <span className="font-semibold text-stone-900">Net profit</span>
                <span className={`font-bold text-lg tabular-nums ${profitCents >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatRs(profitCents)}
                </span>
              </div>
            </div>
            <Link href="/cafe/expenses" className="block mt-2 text-center text-sm text-stone-500 font-medium hover:text-stone-700">
              + Add expense
            </Link>
          </div>
        )}

        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-900 text-sm">Recent orders</h3>
            <Link href="/cafe/orders" className="text-xs text-stone-500 font-medium hover:text-stone-700">View all</Link>
          </div>
          {recentOrders && recentOrders.length > 0 ? (
            <div>
              {recentOrders.slice(0, 4).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      order.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      #{order.kitchen_tickets?.[0]?.token_number || '—'}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800 text-sm">
                        {order.primary_customer_name || `Table ${order.table_number || '—'}`}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {order.payment_method && ` · ${order.payment_method}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900 text-sm tabular-nums">{formatRs(order.total_cents)}</p>
                    <span className={`text-xs ${
                      order.payment_status === 'paid' ? 'text-emerald-600' : 'text-stone-400'
                    }`}>
                      {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-stone-500">No orders yet today</p>
              <p className="text-xs text-stone-400 mt-1">Open the counter to start</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
