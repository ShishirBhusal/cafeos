import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import SetupWizardClient from '@/components/cafe/SetupWizardClient';

export const dynamic = 'force-dynamic';

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* Server Component limitation */ }
        },
      },
    }
  );
}

export default async function CafeSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login?redirect=/cafe/setup');
  if (!user.capabilities.canAccessCafeDashboard) redirect('/');

  const supabase = await createClient();

  // Check if already completed onboarding
  const { data: cafeProfile } = await supabase
    .from('cafe_profiles')
    .select('cafe_id, onboarding_completed')
    .eq('cafe_id', user.id)
    .single();

  if (cafeProfile?.onboarding_completed) {
    redirect('/cafe/dashboard');
  }

  // Get cafe name from vendor_profiles
  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('business_name')
    .eq('user_id', user.id)
    .single();

  const cafeName = vendorProfile?.business_name || 'My Cafe';
  const cafeId = user.id;

  // Fetch all templates
  const { data: templates } = await supabase
    .from('cafe_menu_templates')
    .select('*')
    .order('sort_order');

  return (
    <SetupWizardClient
      cafeId={cafeId}
      cafeName={cafeName}
      templates={templates || []}
    />
  );
}
