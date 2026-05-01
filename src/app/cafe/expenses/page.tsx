import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import ExpensesClient from '@/components/cafe/ExpensesClient';
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
  if (!user) return null;

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
    <CafePageLayout title="Kharcha" description="Track daily expenses">
      <ExpensesClient
        cafeId={cafeId}
        initialExpenses={expenses || []}
        totalExpensesCents={totalExpensesCents}
        profitData={profitData || undefined}
      />
    </CafePageLayout>
  );
}
