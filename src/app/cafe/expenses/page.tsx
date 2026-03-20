import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import ExpensesClient from '@/components/cafe/ExpensesClient';
import { ArrowLeft } from 'lucide-react';
import { getNepaliDateString } from '@/lib/nepalTime';

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

export default async function CafeExpensesPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/expenses');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();
  
  const cafeId = cafeProfile?.user_id || user.id;

  // Fetch today's expenses (Nepal time)
  const todayStr = getNepaliDateString();
  
  const { data: expenses } = await supabase
    .from('daily_expenses')
    .select('*')
    .eq('cafe_id', cafeId)
    .gte('expense_date', todayStr)
    .order('created_at', { ascending: false });

  // Calculate total
  const totalExpensesCents = (expenses || []).reduce(
    (sum, exp) => sum + (exp.amount_cents || 0), 
    0
  );

  // Get daily profit data using our new function
  const { data: profitData } = await supabase.rpc('get_daily_profit_detailed', {
    p_cafe_id: cafeId,
    p_date: todayStr
  });

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/cafe/dashboard" className="p-2 hover:bg-stone-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-stone-900">Daily Expenses</h1>
              <p className="text-sm text-stone-500">{cafeProfile?.business_name}</p>
            </div>
          </div>
        </div>
      </header>

      <ExpensesClient 
        cafeId={cafeId}
        initialExpenses={expenses || []}
        totalExpensesCents={totalExpensesCents}
        profitData={profitData || undefined}
      />
    </div>
  );
}
