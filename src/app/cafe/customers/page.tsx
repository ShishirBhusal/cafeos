import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Star, 
  TrendingUp, 
  Phone,
  Gift,
  Calendar,
  ShoppingBag
} from 'lucide-react';
import CustomerRewardsClient from '@/components/cafe/CustomerRewardsClient';

interface Customer {
  id: string;
  phone: string;
  name: string | null;
  first_visit_at: string;
  last_visit_at: string;
  total_visits: number;
  total_spent_cents: number;
  loyalty_points: number;
  usual_items: { product_id: string; name: string; count: number }[];
}

export default async function CustomerInsightsPage() {
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
  
  // Fetch all customers
  const { data: customers } = await supabase
    .from('cafe_customers')
    .select('*')
    .eq('cafe_id', cafe.user_id)
    .order('total_visits', { ascending: false });
  
  // Calculate summary stats
  const totalCustomers = customers?.length || 0;
  const regulars = (customers || []).filter(c => c.total_visits >= 5).length;
  const totalRevenue = (customers || []).reduce((sum, c) => sum + (c.total_spent_cents || 0), 0);
  const avgVisits = totalCustomers > 0 
    ? Math.round((customers || []).reduce((sum, c) => sum + c.total_visits, 0) / totalCustomers) 
    : 0;
  
  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  
  // Get top customers (by visits)
  const topCustomers = (customers || []).slice(0, 10);
  
  // Get customers who might be eligible for rewards (every 10 visits)
  const rewardEligible = (customers || []).filter(c => c.total_visits >= 10 && c.total_visits % 10 < 3);
  
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/cafe/dashboard" className="p-2 hover:bg-stone-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Customer Chinha</h1>
            <p className="text-sm text-stone-500">Know your regulars</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
              <Users className="w-4 h-4" />
              Total Customers
            </div>
            <div className="text-2xl font-bold text-stone-900 tabular-nums">{totalCustomers}</div>
          </div>
          
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-700 mb-1">
              <Star className="w-4 h-4" />
              Regulars (5+ visits)
            </div>
            <div className="text-2xl font-bold text-amber-700 tabular-nums">{regulars}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              Avg. Visits
            </div>
            <div className="text-2xl font-bold text-stone-900 tabular-nums">{avgVisits}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-stone-200">
            <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
              <ShoppingBag className="w-4 h-4" />
              Customer Revenue
            </div>
            <div className="text-xl font-bold text-stone-900 tabular-nums">{formatPrice(totalRevenue)}</div>
          </div>
        </div>
        
        {/* Actionable Rewards Section */}
        <CustomerRewardsClient cafeId={cafe.user_id} userId={user.id} />
        
        {/* Top Customers List */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <h2 className="font-bold text-stone-900">Your Regulars</h2>
            <span className="text-sm text-stone-500">{totalCustomers} total</span>
          </div>
          
          {!customers || customers.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="font-medium text-stone-600">No customers tracked yet</p>
              <p className="text-sm text-stone-400 mt-1">Add customer phone at checkout to start building relationships</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {topCustomers.map((customer: Customer, index: number) => (
                <Link key={customer.id} href={`/cafe/customers/${customer.id}`} className="block p-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Rank Badge */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-stone-200 text-stone-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-stone-100 text-stone-500'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-900">
                            {customer.name || 'Unknown'}
                          </span>
                          {customer.total_visits >= 10 && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-stone-500">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                        
                        {customer.usual_items && customer.usual_items.length > 0 && (
                          <p className="text-xs text-stone-400 mt-1">
                            Usual: {customer.usual_items.slice(0, 3).map(i => i.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-700 tabular-nums">
                        {customer.total_visits} visits
                      </div>
                      <div className="text-sm text-stone-500 tabular-nums">
                        {formatPrice(customer.total_spent_cents)} spent
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-400 justify-end mt-1">
                        <Calendar className="w-3 h-3" />
                        Last: {formatDate(customer.last_visit_at)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* Tips Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="font-medium text-amber-800 mb-2">Customer Chinha Tips</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>- Checkout ma phone number rakhnus to track visits</li>
            <li>- Regulars lai naam le bolaunu — they love it</li>
            <li>- 10th visit ma free item dinus for loyalty</li>
            <li>- Usual order yaad rakhnus for faster service</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
