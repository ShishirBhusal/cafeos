import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Calendar, 
  ShoppingBag,
  Star,
  Gift,
  TrendingUp,
  Clock,
  Receipt
} from 'lucide-react';
import { formatRs } from '@/lib/formatRs';

interface PageProps {
  params: Promise<{ customerId: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  
  // Fetch cafe info
  const { data: cafe } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();
    
  if (!cafe) redirect('/');
  
  // Fetch customer
  const { data: customer, error } = await supabase
    .from('cafe_customers')
    .select('*')
    .eq('id', customerId)
    .eq('cafe_id', cafe.user_id)
    .single();
  
  if (error || !customer) {
    notFound();
  }
  
  // Fetch customer's order history
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_cents,
      payment_status,
      payment_method,
      created_at,
      order_items(product_name, quantity, unit_price_cents)
    `)
    .eq('cafe_id', cafe.user_id)
    .eq('primary_customer_phone', customer.phone)
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Fetch customer's rewards
  const { data: rewards } = await supabase
    .from('customer_rewards')
    .select('*')
    .eq('customer_id', customerId)
    .eq('cafe_id', cafe.user_id)
    .order('created_at', { ascending: false });
  
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Calculate stats
  const avgOrderValue = customer.total_visits > 0 
    ? Math.round(customer.total_spent_cents / customer.total_visits) 
    : 0;
  const daysSinceLastVisit = customer.last_visit_at 
    ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/cafe/customers" className="p-2 hover:bg-stone-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Customer Details</h1>
            <p className="text-sm text-stone-500">{cafe.business_name}</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Customer Profile Card */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900">
                  {customer.name || 'Unknown Customer'}
                </h2>
                {customer.total_visits >= 10 && (
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-1 text-stone-500 mt-1">
                <Phone className="w-4 h-4" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1 text-stone-500">
                  <Calendar className="w-4 h-4" />
                  Since {formatDate(customer.first_visit_at)}
                </span>
                {daysSinceLastVisit !== null && (
                  <span className="flex items-center gap-1 text-stone-500">
                    <Clock className="w-4 h-4" />
                    {daysSinceLastVisit === 0 ? 'Today' : `${daysSinceLastVisit}d ago`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Total Visits</div>
            <div className="text-2xl font-bold text-amber-600 tabular-nums">{customer.total_visits}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Total Spent</div>
            <div className="text-xl font-bold text-stone-900 tabular-nums">{formatRs(customer.total_spent_cents)}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Avg Order</div>
            <div className="text-xl font-bold text-stone-900 tabular-nums">{formatRs(avgOrderValue)}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Points</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{customer.loyalty_points || 0}</div>
          </div>
        </div>
        
        {/* Usual Items */}
        {customer.usual_items && customer.usual_items.length > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Usual Orders
            </h3>
            <div className="flex flex-wrap gap-2">
              {customer.usual_items.slice(0, 5).map((item: any, i: number) => (
                <span key={i} className="px-3 py-1 bg-white rounded-full text-sm text-amber-700 border border-amber-200">
                  {item.name} ({item.count}x)
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Rewards */}
        {rewards && rewards.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-600" />
                Rewards
              </h3>
            </div>
            <div className="divide-y divide-stone-100">
              {rewards.map((reward: any) => (
                <div key={reward.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-900">{reward.reward_description}</p>
                      <p className="text-sm text-stone-500">{reward.reward_type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reward.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      reward.status === 'redeemed' ? 'bg-stone-100 text-stone-600' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {reward.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Order History */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Recent Orders
            </h3>
          </div>
          
          {!orders || orders.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.map((order: any) => (
                <div key={order.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-stone-900">{formatRs(order.total_cents)}</p>
                      <p className="text-sm text-stone-500">
                        {formatDate(order.created_at)} at {formatTime(order.created_at)}
                      </p>
                      {order.order_items && order.order_items.length > 0 && (
                        <p className="text-xs text-stone-400 mt-1">
                          {order.order_items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.payment_status === 'paid' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
