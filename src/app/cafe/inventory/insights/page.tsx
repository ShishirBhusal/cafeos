import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import InsightsClient from '@/components/cafe/InsightsClient';
import { loadInventoryDataset } from '@/lib/algorithms/inventory-data';
import { abcAnalysis } from '@/lib/algorithms/abc-analysis';

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
            // Server Component limitation
          }
        },
      },
    }
  );
}

export default async function InventoryInsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login?redirect=/cafe/inventory/insights');
  if (!user.capabilities.canAccessCafeDashboard) redirect('/');

  const supabase = await createClient();

  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = cafeProfile?.user_id || user.id;

  const dataset = await loadInventoryDataset(supabase, cafeId, 28);
  const abc = abcAnalysis(dataset.abcInputs);

  const hasData = dataset.menuSales.length > 0 || dataset.abcInputs.length > 0;

  return (
    <CafePageLayout
      title="Smart Insights"
      description="Demand forecasting & inventory prioritisation"
      actions={
        <Link
          href="/cafe/inventory"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
        >
          <ArrowLeft className="w-4 h-4" /> Inventory
        </Link>
      }
    >
      {hasData ? (
        <InsightsClient
          windowDays={dataset.windowDays}
          startDate={dataset.startDate}
          endDate={dataset.endDate}
          menuSales={dataset.menuSales}
          abc={abc}
        />
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <p className="font-medium text-stone-900">Not enough data yet</p>
          <p className="text-sm text-stone-500 mt-1">
            Record a few sales and link recipes to your menu items, then the forecast and
            ABC analysis will appear here.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/cafe/counter" className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800">
              Take an order
            </Link>
            <Link href="/cafe/inventory/recipes" className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50">
              Link recipes
            </Link>
          </div>
        </div>
      )}
    </CafePageLayout>
  );
}
