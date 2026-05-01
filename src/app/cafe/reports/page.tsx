import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Receipt,
  Users,
  Repeat,
  Clock,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { formatRs, calculateDailyFixedCost } from '@/lib/formatRs';
import { getNepaliDateString, nepalDateToUTCRange, getNepaliDateDaysAgo } from '@/lib/nepalTime';

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
  searchParams: Promise<{ period?: string }>;
}

export default async function CafeReportsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { period = 'today' } = await searchParams;
  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();
  
  const cafeId = cafeProfile?.user_id || user.id;

  // Calculate date range based on Nepal timezone
  const todayNepal = getNepaliDateString();
  let startDateStr: string;
  let endDateStr: string = todayNepal;

  switch (period) {
    case 'week':
      startDateStr = getNepaliDateDaysAgo(7);
      break;
    case 'month':
      // First day of current month in Nepal
      startDateStr = todayNepal.substring(0, 8) + '01';
      break;
    default: // today
      startDateStr = todayNepal;
  }

  // Convert Nepal dates to UTC ranges for database queries
  const { start: startUTC } = nepalDateToUTCRange(startDateStr);
  const { end: endUTC } = nepalDateToUTCRange(endDateStr);

  // Fetch orders for period
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_cents, payment_status, created_at')
    .eq('cafe_id', cafeId)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC);

  // Fetch expenses for period
  const { data: expenses } = await supabase
    .from('daily_expenses')
    .select('amount_cents, expense_date')
    .eq('cafe_id', cafeId)
    .gte('expense_date', startDateStr)
    .lte('expense_date', endDateStr);

  // Fetch fixed costs for daily share calculation
  const { data: fixedCosts } = await supabase
    .from('cafe_fixed_costs')
    .select('amount_cents, frequency')
    .eq('cafe_id', cafeId)
    .eq('is_active', true);

  // Calculate daily fixed cost share using actual days in month
  const dailyFixedCost = calculateDailyFixedCost(
    (fixedCosts || []).map(c => ({ amount_cents: c.amount_cents, frequency: c.frequency }))
  );

  // Calculate number of days in period
  const startParts = startDateStr.split('-').map(Number);
  const endParts = endDateStr.split('-').map(Number);
  const startMs = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();
  const endMs = new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime();
  const daysDiff = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1 || 1;
  const totalFixedCostsCents = dailyFixedCost * daysDiff;

  // Calculate metrics
  const totalOrders = orders?.length || 0;
  const paidOrders = orders?.filter(o => o.payment_status === 'paid') || [];
  const revenueCents = paidOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
  const unpaidCents = (orders || [])
    .filter(o => o.payment_status === 'unpaid')
    .reduce((sum, o) => sum + (o.total_cents || 0), 0);
  const expensesCents = (expenses || []).reduce((sum, e) => sum + (e.amount_cents || 0), 0);
  const totalCostsCents = expensesCents + totalFixedCostsCents;
  const profitCents = revenueCents - totalCostsCents;
  const avgOrderCents = paidOrders.length > 0 ? Math.round(revenueCents / paidOrders.length) : 0;


  // Fetch analytics (uses its own date range based on days)
  const analyticsDays = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const { data: analyticsRaw } = await supabase.rpc('get_cafe_analytics', {
    p_cafe_id: cafeId,
    p_days: analyticsDays,
  });
  const analytics = analyticsRaw as {
    aov: number;
    total_orders: number;
    total_revenue: number;
    unique_customers: number;
    repeat_customers: number;
    repeat_rate: number;
    cash_amount: number;
    digital_amount: number;
    payment_split: { cash_pct: number; digital_pct: number };
    top_items: { name: string; quantity: number; revenue: number }[];
    peak_hours: { hour: number; orders: number; revenue: number }[];
    order_type_split: { type: string; count: number; revenue: number }[];
  } | null;

  const periodLabels: Record<string, string> = {
    today: "Today's",
    week: 'Last 7 Days',
    month: 'This Month',
  };

  const periodSelector = (
    <div className="flex gap-2">
      {['today', 'week', 'month'].map(p => (
        <Link
          key={p}
          href={`/cafe/reports?period=${p}`}
          className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
            period === p
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : 'Month'}
        </Link>
      ))}
    </div>
  );

  return (
    <CafePageLayout title="Reports" description="Business reports and analytics" actions={periodSelector}>
      <div className="space-y-4">
        {/* Revenue Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{periodLabels[period]} Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatRs(revenueCents)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Paid Orders</p>
              <p className="text-lg font-semibold text-gray-900">{paidOrders.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Order</p>
              <p className="text-lg font-semibold text-gray-900">{formatRs(avgOrderCents)}</p>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <Receipt className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{periodLabels[period]} Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatRs(expensesCents)}</p>
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className={`rounded-xl p-6 shadow-sm ${profitCents >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${profitCents >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {profitCents >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">{periodLabels[period]} Profit</p>
              <p className={`text-3xl font-bold ${profitCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRs(profitCents)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Revenue</span>
              <span className="text-green-600 font-medium">+{formatRs(revenueCents)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-600">Daily Expenses</span>
              <span className="text-red-600 font-medium">-{formatRs(expensesCents)}</span>
            </div>
            {totalFixedCostsCents > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Fixed Costs ({daysDiff} days)</span>
                <span className="text-red-600 font-medium">-{formatRs(totalFixedCostsCents)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Unpaid Orders Warning */}
        {unpaidCents > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-800">Unpaid Orders</p>
                <p className="text-sm text-yellow-700">
                  {formatRs(unpaidCents)} pending collection
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customer & Payment Metrics */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-stone-500">Customers</span>
              </div>
              <p className="text-xl font-bold text-stone-900">{analytics.unique_customers}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="w-4 h-4 text-stone-500" />
                <span className="text-xs font-medium text-stone-500">Repeat Rate</span>
              </div>
              <p className="text-xl font-bold text-stone-900">{analytics.repeat_rate}%</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-stone-500">Cash</span>
              </div>
              <p className="text-xl font-bold text-stone-900">{analytics.payment_split.cash_pct}%</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-stone-500">Digital</span>
              </div>
              <p className="text-xl font-bold text-stone-900">{analytics.payment_split.digital_pct}%</p>
            </div>
          </div>
        )}

        {/* Top Items */}
        {analytics && analytics.top_items.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-4">Top Selling Items</h3>
            <div className="space-y-3">
              {analytics.top_items.slice(0, 8).map((item, idx) => {
                const maxQty = analytics.top_items[0]?.quantity || 1;
                const pct = Math.round((item.quantity / maxQty) * 100);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-stone-400 text-right">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-stone-900 truncate">{item.name}</span>
                        <span className="text-sm text-stone-500 flex-shrink-0 ml-2">
                          {item.quantity} sold · {formatRs(item.revenue)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-stone-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Peak Hours */}
        {analytics && analytics.peak_hours.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-500" />
              Peak Hours
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {Array.from({ length: 18 }, (_, i) => i + 6).map(hour => {
                const hourData = analytics.peak_hours.find((h: any) => h.hour === hour);
                const maxOrders = Math.max(...analytics.peak_hours.map((h: any) => h.orders));
                const intensity = hourData ? Math.round((hourData.orders / maxOrders) * 100) : 0;
                return (
                  <div key={hour} className="text-center" title={hourData ? `${hourData.orders} orders, ${formatRs(hourData.revenue)}` : 'No orders'}>
                    <div
                      className={`h-10 rounded-lg mb-1 ${
                        intensity >= 75 ? 'bg-stone-400' :
                        intensity >= 50 ? 'bg-stone-300' :
                        intensity >= 25 ? 'bg-stone-200' :
                        intensity > 0 ? 'bg-stone-100' :
                        'bg-stone-100'
                      }`}
                    />
                    <span className="text-[10px] text-stone-500">{hour > 12 ? `${hour - 12}p` : hour === 12 ? '12p' : `${hour}a`}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-stone-100 rounded" /> None</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-stone-200 rounded" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-stone-300 rounded" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-stone-400 rounded" /> Peak</span>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-bold text-stone-900 mb-3">Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Total Orders</span>
              <span className="font-medium text-stone-900">{totalOrders}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Paid Orders</span>
              <span className="font-medium text-emerald-600">{paidOrders.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Unpaid Orders</span>
              <span className="font-medium text-stone-500">{totalOrders - paidOrders.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Average Order Value</span>
              <span className="font-medium text-stone-900">{formatRs(avgOrderCents)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-stone-500">Profit Margin</span>
              <span className={`font-medium ${profitCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {revenueCents > 0 ? `${Math.round((profitCents / revenueCents) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CafePageLayout>
  );
}
