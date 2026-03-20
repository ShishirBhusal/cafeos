import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Receipt,
  Calendar
} from 'lucide-react';
import { formatRs, calculateDailyFixedCost } from '@/lib/formatRs';
import { getNepaliDateString, nepalDateToUTCRange, getNepaliNow, getNepaliDateDaysAgo } from '@/lib/nepalTime';

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
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/reports');
  }
  
  if (!user.capabilities.canViewCafeReports) {
    redirect('/');
  }

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


  const periodLabels: Record<string, string> = {
    today: "Today's",
    week: 'Last 7 Days',
    month: 'This Month',
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/cafe/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-500">{cafeProfile?.business_name}</p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            {['today', 'week', 'month'].map(p => (
              <Link
                key={p}
                href={`/cafe/reports?period=${p}`}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                  period === p 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : 'Month'}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
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
        <div className="bg-white rounded-2xl p-6 shadow-sm">
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
        <div className={`rounded-2xl p-6 shadow-sm ${profitCents >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
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

        {/* Summary Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-medium text-gray-900">{totalOrders}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Paid Orders</span>
              <span className="font-medium text-green-600">{paidOrders.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Unpaid Orders</span>
              <span className="font-medium text-yellow-600">{totalOrders - paidOrders.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Profit Margin</span>
              <span className={`font-medium ${profitCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueCents > 0 ? `${Math.round((profitCents / revenueCents) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
