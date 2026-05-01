import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { formatRs } from '@/lib/formatRs';
import { 
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Trophy,
  Users,
  ShoppingBag,
  DollarSign,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';

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

interface WeeklyReview {
  week_start: string;
  week_end: string;
  what_happened: {
    total_revenue_cents: number;
    total_orders: number;
    total_expenses_cents: number;
    net_profit_cents: number;
    new_customers: number;
    top_item: { name: string; quantity: number; revenue_cents: number } | null;
    busiest_day: { day: string; date: string; orders: number; revenue_cents: number } | null;
    slowest_day: { day: string; date: string; orders: number; revenue_cents: number } | null;
  };
  comparison: {
    prev_week_revenue_cents: number;
    revenue_change_percent: number | null;
  };
}

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function WeeklyReviewPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/story/weekly');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const supabase = await createClient();
  const params = await searchParams;

  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();
  
  const cafeId = cafeProfile?.user_id || user.id;

  // Parse week parameter or default to last week
  let weekStart: string | null = null;
  if (params.week) {
    weekStart = params.week;
  }

  // Fetch weekly review
  const { data: review, error } = await supabase.rpc('get_weekly_review', {
    p_cafe_id: cafeId,
    p_week_start: weekStart
  });

  const weeklyData = review as WeeklyReview | null;

  // Calculate previous and next week links
  const currentWeekStart = weeklyData?.week_start ? new Date(weeklyData.week_start) : new Date();
  const prevWeek = new Date(currentWeekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(currentWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const today = new Date();
  const canGoNext = nextWeek < today;

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', options)} - ${e.toLocaleDateString('en-US', options)}`;
  };

  const getNepaliWeekday = (dayName: string) => {
    const map: Record<string, string> = {
      'Sunday': 'आइतबार',
      'Monday': 'सोमबार',
      'Tuesday': 'मंगलबार',
      'Wednesday': 'बुधबार',
      'Thursday': 'बिहिबार',
      'Friday': 'शुक्रबार',
      'Saturday': 'शनिबार'
    };
    return map[dayName] || dayName;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/cafe/story" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Hapta Ko Samiksha</h1>
              <p className="text-purple-200 text-sm">Weekly Review</p>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-white/10 rounded-xl p-3">
            <Link
              href={`/cafe/story/weekly?week=${prevWeek.toISOString().split('T')[0]}`}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="w-4 h-4 text-purple-200" />
                <span className="font-semibold">
                  {weeklyData ? formatDateRange(weeklyData.week_start, weeklyData.week_end) : 'Loading...'}
                </span>
              </div>
            </div>

            {canGoNext ? (
              <Link
                href={`/cafe/story/weekly?week=${nextWeek.toISOString().split('T')[0]}`}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-2 opacity-30">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {!weeklyData || error ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="font-medium text-stone-600">No data for this week</p>
            <p className="text-sm text-stone-400 mt-1">Start taking orders to see your weekly review</p>
          </div>
        ) : (
          <>
            {/* Hero Stats */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Revenue */}
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm text-stone-500 mb-1">Hafta Ko Amdani</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-stone-900 tabular-nums">
                      {formatRs(weeklyData.what_happened.total_revenue_cents)}
                    </span>
                    {weeklyData.comparison.revenue_change_percent !== null && (
                      <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
                        weeklyData.comparison.revenue_change_percent >= 0 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {weeklyData.comparison.revenue_change_percent >= 0 ? (
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 inline mr-1" />
                        )}
                        {Math.abs(weeklyData.comparison.revenue_change_percent)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    vs previous week: {formatRs(weeklyData.comparison.prev_week_revenue_cents)}
                  </p>
                </div>

                {/* Profit */}
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm text-stone-500 mb-1">Khudra Nafa</p>
                  <span className={`text-3xl font-bold tabular-nums ${
                    weeklyData.what_happened.net_profit_cents >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {formatRs(weeklyData.what_happened.net_profit_cents)}
                  </span>
                  <p className="text-xs text-stone-400 mt-1">
                    Expenses: {formatRs(weeklyData.what_happened.total_expenses_cents)}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <ShoppingBag className="w-6 h-6 text-stone-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-stone-900 tabular-nums">
                  {weeklyData.what_happened.total_orders}
                </p>
                <p className="text-xs text-stone-500">Orders</p>
              </div>
              
              <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-stone-900 tabular-nums">
                  {weeklyData.what_happened.new_customers}
                </p>
                <p className="text-xs text-stone-500">New Customers</p>
              </div>

              <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-stone-900 tabular-nums">
                  {weeklyData.what_happened.total_orders > 0 
                    ? formatRs(Math.round(weeklyData.what_happened.total_revenue_cents / weeklyData.what_happened.total_orders))
                    : 'Rs 0'}
                </p>
                <p className="text-xs text-stone-500">Avg Order</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-stone-500" />
                Hafta Ka Highlights
              </h3>

              <div className="space-y-4">
                {/* Top Item */}
                {weeklyData.what_happened.top_item && (
                  <div className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl">
                    <div className="p-2 bg-stone-100 rounded-lg">
                      <Trophy className="w-5 h-5 text-stone-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">Top Seller</p>
                      <p className="text-sm text-stone-600">
                        <strong>{weeklyData.what_happened.top_item.name}</strong> — {weeklyData.what_happened.top_item.quantity} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-700 tabular-nums">
                        {formatRs(weeklyData.what_happened.top_item.revenue_cents)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Busiest Day */}
                {weeklyData.what_happened.busiest_day && (
                  <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-xl">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">Busiest Day</p>
                      <p className="text-sm text-stone-600">
                        <strong>{getNepaliWeekday(weeklyData.what_happened.busiest_day.day)}</strong> — {weeklyData.what_happened.busiest_day.orders} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700 tabular-nums">
                        {formatRs(weeklyData.what_happened.busiest_day.revenue_cents)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Slowest Day */}
                {weeklyData.what_happened.slowest_day && weeklyData.what_happened.slowest_day.day !== weeklyData.what_happened.busiest_day?.day && (
                  <div className="flex items-center gap-4 p-3 bg-stone-100 rounded-xl">
                    <div className="p-2 bg-stone-200 rounded-lg">
                      <TrendingDown className="w-5 h-5 text-stone-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">Slowest Day</p>
                      <p className="text-sm text-stone-600">
                        <strong>{getNepaliWeekday(weeklyData.what_happened.slowest_day.day)}</strong> — {weeklyData.what_happened.slowest_day.orders} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-600 tabular-nums">
                        {formatRs(weeklyData.what_happened.slowest_day.revenue_cents)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-5">
              <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-600" />
                Ke Bujhne?
              </h3>
              <ul className="space-y-2 text-sm text-purple-800">
                {weeklyData.comparison.revenue_change_percent !== null && (
                  <li>
                    • Revenue {weeklyData.comparison.revenue_change_percent >= 0 ? 'increased' : 'decreased'} by {Math.abs(weeklyData.comparison.revenue_change_percent)}% compared to last week
                  </li>
                )}
                {weeklyData.what_happened.top_item && (
                  <li>
                    • {weeklyData.what_happened.top_item.name} is your star performer this week
                  </li>
                )}
                {weeklyData.what_happened.busiest_day && weeklyData.what_happened.slowest_day && (
                  <li>
                    • {getNepaliWeekday(weeklyData.what_happened.busiest_day.day)} brings {Math.round((weeklyData.what_happened.busiest_day.orders / weeklyData.what_happened.slowest_day.orders - 1) * 100)}% more orders than {getNepaliWeekday(weeklyData.what_happened.slowest_day.day)}
                  </li>
                )}
                {weeklyData.what_happened.new_customers > 0 && (
                  <li>
                    • You gained {weeklyData.what_happened.new_customers} new customer{weeklyData.what_happened.new_customers > 1 ? 's' : ''} this week — keep them coming back!
                  </li>
                )}
              </ul>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <Link
                href="/cafe/story"
                className="flex-1 text-center py-3 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Daily Story
              </Link>
              <Link
                href="/cafe/reports"
                className="flex-1 text-center py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Full Reports
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
