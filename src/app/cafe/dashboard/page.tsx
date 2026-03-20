import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { formatRs } from '@/lib/formatRs';
import { getNepaliGreeting, getNepaliDayName, getNepaliHour, getNepaliDateString } from '@/lib/nepalTime';
import { 
  UtensilsCrossed, 
  ChefHat, 
  BarChart3, 
  Settings,
  Receipt,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Calculator,
  Star,
  Zap,
  BookOpen,
  ArrowRight,
  Coffee,
  Sun,
  Moon,
  Sunset
} from 'lucide-react';
import DecisionFeedClient from '@/components/cafe/DecisionFeedClient';

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

function getGreeting(): { text: string; emoji: string; icon: typeof Sun } {
  const hour = getNepaliHour();
  if (hour >= 4 && hour < 12) return { text: 'शुभ प्रभात', emoji: '☀️', icon: Sun };
  if (hour >= 12 && hour < 17) return { text: 'शुभ दिन', emoji: '🌤️', icon: Sun };
  if (hour >= 17 && hour < 20) return { text: 'शुभ सन्ध्या', emoji: '🌅', icon: Sunset };
  return { text: 'शुभ रात्रि', emoji: '🌙', icon: Moon };
}


export default async function CafeDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/dashboard');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const supabase = await createClient();

  // Check onboarding status — redirect to setup wizard if not completed
  const { data: onboardingCheck } = await supabase
    .from('cafe_profiles')
    .select('onboarding_completed')
    .eq('cafe_id', user.id)
    .single();

  if (onboardingCheck && !onboardingCheck.onboarding_completed) {
    redirect('/cafe/setup');
  }
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name, contact_name')
    .eq('user_id', user.id)
    .single();
  
  const cafeId = cafeProfile?.user_id || user.id;
  const ownerName = cafeProfile?.contact_name || cafeProfile?.business_name || 'there';

  // Fetch daily profit using enhanced function with fixed costs
  const { data: dailyProfit } = await supabase
    .rpc('get_daily_profit_detailed', { p_cafe_id: cafeId });

  // Fetch pending kitchen tickets count
  const { count: pendingTickets } = await supabase
    .from('kitchen_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('cafe_id', cafeId)
    .in('status', ['pending', 'preparing']);

  // Fetch recent orders for display
  const { data: recentOrders } = await supabase
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
    .limit(5);

  // Fetch daily story for inline card
  const { data: dailyStory } = await supabase.rpc('get_daily_story', { p_cafe_id: cafeId });
  const story = dailyStory as any;

  // Format values — revenue now only counts PAID orders
  const profitData = dailyProfit as { revenue_cents: number; expense_cents: number; fixed_cost_share_cents: number; profit_cents: number; order_count: number; unpaid_cents: number; unpaid_count: number } | null;
  const revenueCents = profitData?.revenue_cents || 0;
  const profitCents = profitData?.profit_cents || 0;
  const expenseCents = (profitData?.expense_cents || 0) + (profitData?.fixed_cost_share_cents || 0);
  const todayOrders = profitData?.order_count || 0;
  const unpaidCents = profitData?.unpaid_cents || 0;
  const unpaidCount = profitData?.unpaid_count || 0;

  // Compute trends from daily story comparison data
  const comparison = story?.comparison;
  const avgRevenue = comparison?.vs_30day_avg_revenue || 0;
  const revenueTrend = avgRevenue > 0 && revenueCents > 0
    ? { direction: revenueCents >= avgRevenue ? 'up' as const : 'down' as const, 
        label: `${Math.abs(Math.round(((revenueCents - avgRevenue) / avgRevenue) * 100))}% vs 30d avg` }
    : undefined;

  const greeting = getGreeting();
  const nepaliDay = getNepaliDayName();

  // Determine time-of-day context for smart suggestions (Nepal time)
  const hour = getNepaliHour();
  const isMorning = hour >= 4 && hour < 12;
  const isClosingTime = hour >= 20 || hour < 4;

  // Smart suggestion based on time and state
  const getSmartNudge = () => {
    if (isClosingTime && (unpaidCount || 0) > 0)
      return { text: `${unpaidCount} unpaid — collect before closing`, urgent: true };
    if (isClosingTime)
      return { text: 'Ready to close? Check Din Ko Hisab', urgent: false };
    if (isMorning && todayOrders === 0)
      return { text: 'Counter खोल्नुस् — orders लिन ready?', urgent: false };
    if ((pendingTickets || 0) >= 3)
      return { text: `Kitchen ma ${pendingTickets} orders — check queue`, urgent: true };
    if ((unpaidCount || 0) > 0)
      return { text: `${formatRs(unpaidCents)} collect गर्न बाँकी`, urgent: false };
    if (todayOrders > 0 && profitCents > 0)
      return { text: 'राम्रो चलिरहेको छ!', urgent: false };
    return null;
  };
  const smartNudge = getSmartNudge();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ═══ HERO: One Number, One Story ═══ */}
      <header className="bg-gradient-to-br from-amber-700 via-amber-600 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto px-5 pt-6 pb-8">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Coffee className="w-5 h-5" />
              </div>
              <span className="font-semibold text-sm text-amber-100">
                {cafeProfile?.business_name || 'CafeOS'} · {nepaliDay}
              </span>
            </div>
            <Link 
              href="/cafe/counter"
              className="px-4 py-2 bg-white text-amber-700 font-bold text-sm rounded-xl hover:bg-amber-50 transition-colors shadow-sm"
            >
              <UtensilsCrossed className="w-4 h-4 inline mr-1.5" />
              Counter
            </Link>
          </div>
          
          {/* Greeting */}
          <p className="text-amber-100 text-sm">
            {greeting.text}, {ownerName}! {greeting.emoji}
          </p>
          
          {/* THE ONE NUMBER: Today's Profit */}
          <div className="mt-3">
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wider">
              {todayOrders > 0 ? 'आजको नाफा (Today\'s Profit)' : 'Today'}
            </p>
            {todayOrders > 0 ? (
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-5xl font-bold tabular-nums ${profitCents >= 0 ? 'text-white' : 'text-rose-200'}`}>
                  {formatRs(profitCents)}
                </span>
                {revenueTrend && (
                  <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                    revenueTrend.direction === 'up' ? 'bg-white/20 text-emerald-200' : 'bg-rose-500/30 text-rose-200'
                  }`}>
                    {revenueTrend.direction === 'up' ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {revenueTrend.label}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-3xl font-bold mt-1">No orders yet</p>
            )}
            <p className="text-amber-200 text-sm mt-1.5">
              {todayOrders > 0 
                ? `${todayOrders} orders · ${formatRs(revenueCents)} revenue · ${formatRs(expenseCents)} expenses`
                : 'Open the Counter to start your day'
              }
            </p>
          </div>

          {/* Smart nudge */}
          {smartNudge && (
            <div className={`mt-4 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
              smartNudge.urgent ? 'bg-rose-500/30 text-white' : 'bg-white/15 text-amber-100'
            }`}>
              {smartNudge.urgent && <Zap className="w-3.5 h-3.5 inline mr-1.5" />}
              {smartNudge.text}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-5 space-y-4">
        
        {/* ═══ DECISION FEED - The Brain ═══ */}
        <DecisionFeedClient cafeId={cafeId} compact={true} />

        {/* ═══ TWO PRIMARY ACTIONS ═══ */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/cafe/counter"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white hover:shadow-lg transition-all group"
          >
            <UtensilsCrossed className="w-8 h-8 mb-2 text-white/80" />
            <p className="font-bold text-lg">Counter POS</p>
            <p className="text-white/70 text-sm mt-0.5">Take orders</p>
            <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/cafe/kitchen"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-700 to-stone-900 p-5 text-white hover:shadow-lg transition-all group"
          >
            <ChefHat className="w-8 h-8 mb-2 text-white/80" />
            <p className="font-bold text-lg">Kitchen</p>
            <p className="text-white/70 text-sm mt-0.5">{pendingTickets || 0} in queue</p>
            <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* ═══ SECONDARY ACTIONS (compact row) ═══ */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: '/cafe/story', label: 'Katha', icon: <BookOpen className="w-5 h-5" />, color: 'text-amber-700' },
            { href: '/cafe/shift', label: 'Hisab', icon: <Calculator className="w-5 h-5" />, color: 'text-emerald-700' },
            { href: '/cafe/orders', label: 'Orders', icon: <Receipt className="w-5 h-5" />, color: 'text-stone-600' },
            { href: '/cafe/expenses', label: 'Kharcha', icon: <DollarSign className="w-5 h-5" />, color: 'text-stone-600' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-1.5 py-3 bg-white rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all"
            >
              <span className={link.color}>{link.icon}</span>
              <span className="text-xs font-medium text-stone-700">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* ═══ TODAY'S STORY (if data exists) ═══ */}
        {story && story.total_orders > 0 && (
          <Link href="/cafe/story" className="block">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Aaja Ko Katha
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{story.day_name_np || story.day_name}</span>
                  <Link
                    href="/cafe/story/weekly"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 font-medium hover:bg-amber-100 transition-colors"
                  >
                    This Week →
                  </Link>
                </div>
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
                  <p className="text-2xl font-bold text-amber-700">{story.top_item?.name || '—'}</p>
                  <p className="text-xs text-stone-500">Top Item</p>
                </div>
              </div>
              {story.insights && story.insights.length > 0 && (
                <p className="text-sm text-stone-500 italic mt-3 pt-3 border-t border-stone-100">
                  &ldquo;{story.insights[0]}&rdquo;
                </p>
              )}
            </div>
          </Link>
        )}

        {/* ═══ PROFIT BREAKDOWN (clean, simple) ═══ */}
        {todayOrders > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="font-bold text-stone-900 mb-3">Din Ko Hisab</h3>
            <div className="space-y-0.5">
              <div className="flex justify-between py-2.5 text-sm">
                <span className="text-stone-500">आम्दानी (Revenue)</span>
                <span className="font-semibold text-emerald-700 tabular-nums">+{formatRs(revenueCents)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-sm border-b border-stone-100">
                <span className="text-stone-500">खर्च (Expenses)</span>
                <span className="font-semibold text-rose-600 tabular-nums">-{formatRs(expenseCents)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="font-bold text-stone-900">नाफा (Net Profit)</span>
                <span className={`font-bold text-xl tabular-nums ${profitCents >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatRs(profitCents)}
                </span>
              </div>
            </div>
            <Link href="/cafe/expenses" className="block mt-2 text-center text-sm text-amber-700 font-medium hover:underline">
              + Add today&apos;s expense
            </Link>
          </div>
        )}

        {/* ═══ RECENT ORDERS ═══ */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-900">Recent Orders</h3>
            <Link href="/cafe/orders" className="text-xs text-amber-700 font-medium hover:underline">View all</Link>
          </div>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-0">
              {recentOrders.slice(0, 4).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-stone-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      #{order.kitchen_tickets?.[0]?.token_number || '—'}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800 text-sm">
                        {order.primary_customer_name || `Table ${order.table_number || '—'}`}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-900 text-sm tabular-nums">{formatRs(order.total_cents)}</p>
                    <span className={`text-xs ${
                      order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-400">
              <Coffee className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-stone-500">No orders yet today</p>
            </div>
          )}
        </div>

        {/* ═══ MORE TOOLS (tertiary navigation) ═══ */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { href: '/cafe/customers', label: 'Customers', icon: <Star className="w-4 h-4" /> },
            { href: '/cafe/tables', label: 'Tables', icon: <UtensilsCrossed className="w-4 h-4" /> },
            { href: '/cafe/menu', label: 'Menu', icon: <Coffee className="w-4 h-4" /> },
            { href: '/cafe/inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
            { href: '/cafe/reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
            { href: '/cafe/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl border border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50 transition-all whitespace-nowrap text-xs font-medium"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
