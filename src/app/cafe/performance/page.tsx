import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Clock,
  Award,
  Target,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar
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

interface ShiftStats {
  staff_id: string;
  staff_email: string;
  total_shifts: number;
  total_sales_cents: number;
  total_orders: number;
  perfect_closes: number;
  variance_total_cents: number;
  avg_orders_per_shift: number;
}

export default async function PerformanceDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = cafeProfile?.user_id || user.id;

  // Fetch shift data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('cafe_id', cafeId)
    .gte('opened_at', thirtyDaysAgo.toISOString())
    .order('opened_at', { ascending: false });

  // Fetch orders for the last 30 days
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_cents, created_at, user_id')
    .eq('cafe_id', cafeId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Fetch user profiles for staff names
  const staffIds = [...new Set([
    ...(shifts || []).map(s => s.opened_by),
    ...(orders || []).map(o => o.user_id)
  ].filter(Boolean))];

  const { data: staffProfiles } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .in('id', staffIds.length > 0 ? staffIds : ['00000000-0000-0000-0000-000000000000']);

  const staffMap = new Map(
    (staffProfiles || []).map(s => [s.id, s.full_name || s.email?.split('@')[0] || 'Unknown'])
  );

  // Calculate staff performance metrics
  const staffStats: Record<string, ShiftStats> = {};

  // Process shifts
  (shifts || []).forEach(shift => {
    const staffId = shift.opened_by;
    if (!staffStats[staffId]) {
      staffStats[staffId] = {
        staff_id: staffId,
        staff_email: staffMap.get(staffId) || 'Unknown',
        total_shifts: 0,
        total_sales_cents: 0,
        total_orders: 0,
        perfect_closes: 0,
        variance_total_cents: 0,
        avg_orders_per_shift: 0,
      };
    }
    
    staffStats[staffId].total_shifts++;
    
    if (shift.status === 'closed') {
      if (shift.variance_cents === 0) {
        staffStats[staffId].perfect_closes++;
      }
      staffStats[staffId].variance_total_cents += shift.variance_cents || 0;
    }
  });

  // Process orders (associate with staff who took them)
  (orders || []).forEach(order => {
    const staffId = order.user_id;
    if (!staffId) return;
    
    if (!staffStats[staffId]) {
      staffStats[staffId] = {
        staff_id: staffId,
        staff_email: staffMap.get(staffId) || 'Unknown',
        total_shifts: 0,
        total_sales_cents: 0,
        total_orders: 0,
        perfect_closes: 0,
        variance_total_cents: 0,
        avg_orders_per_shift: 0,
      };
    }
    
    staffStats[staffId].total_sales_cents += order.total_cents;
    staffStats[staffId].total_orders++;
  });

  // Calculate averages
  Object.values(staffStats).forEach(stats => {
    if (stats.total_shifts > 0) {
      stats.avg_orders_per_shift = Math.round(stats.total_orders / stats.total_shifts);
    }
  });

  // Sort by total sales
  const sortedStaff = Object.values(staffStats).sort((a, b) => b.total_sales_cents - a.total_sales_cents);

  // Calculate totals
  const totalSales = sortedStaff.reduce((sum, s) => sum + s.total_sales_cents, 0);
  const totalOrders = sortedStaff.reduce((sum, s) => sum + s.total_orders, 0);
  const totalShifts = sortedStaff.reduce((sum, s) => sum + s.total_shifts, 0);
  const totalPerfectCloses = sortedStaff.reduce((sum, s) => sum + s.perfect_closes, 0);

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  return (
    <CafePageLayout title="Performance" description="Track business performance">
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="w-4 h-4" />
              Total Sales
            </div>
            <div className="text-xl font-bold text-gray-900">{formatPrice(totalSales)}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <ShoppingCart className="w-4 h-4" />
              Total Orders
            </div>
            <div className="text-xl font-bold text-gray-900">{totalOrders}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              Total Shifts
            </div>
            <div className="text-xl font-bold text-gray-900">{totalShifts}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Perfect Closes
            </div>
            <div className="text-xl font-bold text-green-600">{totalPerfectCloses}</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-stone-900">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5" />
              Staff Leaderboard
            </h2>
          </div>
          
          {sortedStaff.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No staff activity recorded yet</p>
              <p className="text-sm">Start taking orders to see performance metrics</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedStaff.map((staff, index) => (
                <div key={staff.staff_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0 ? 'bg-stone-100 text-stone-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                      index === 2 ? 'bg-stone-100 text-stone-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Staff Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{staff.staff_email}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          {staff.total_orders} orders
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {staff.total_shifts} shifts
                        </span>
                        {staff.avg_orders_per_shift > 0 && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {staff.avg_orders_per_shift} orders/shift
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-stone-700">
                        {formatPrice(staff.total_sales_cents)}
                      </div>
                      {staff.total_shifts > 0 && (
                        <div className={`text-sm flex items-center gap-1 justify-end ${
                          staff.variance_total_cents >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {staff.variance_total_cents >= 0 ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {staff.perfect_closes}/{staff.total_shifts} perfect
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Insights
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Perfect Close</strong>: When actual cash matches expected cash exactly</li>
            <li>• <strong>Orders/Shift</strong>: Average number of orders during each shift</li>
            <li>• Track staff performance to identify training needs and top performers</li>
            <li>• Recognize employees with consistent perfect closes</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/cafe/shift"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Shift History</h4>
              <p className="text-sm text-gray-500">View all shifts</p>
            </div>
          </Link>
          
          <Link
            href="/cafe/customers"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="p-2 bg-stone-100 rounded-lg">
              <Users className="w-5 h-5 text-stone-500" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Customer Insights</h4>
              <p className="text-sm text-gray-500">View regulars</p>
            </div>
          </Link>
        </div>
      </div>
    </CafePageLayout>
  );
}
