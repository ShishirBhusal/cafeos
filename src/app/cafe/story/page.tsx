import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import DailyStoryPageClient from './DailyStoryPageClient';

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

export default async function DailyStoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = vendorProfile?.user_id || user.id;
  const cafeName = vendorProfile?.business_name || 'My Cafe';

  // Fetch today's story
  const { data: story } = await supabase.rpc('get_daily_story', { p_cafe_id: cafeId });

  return (
    <CafePageLayout title="Aaja Ko Katha" description="Your daily story">
      <DailyStoryPageClient
        cafeId={cafeId}
        cafeName={cafeName}
        initialStory={story}
      />
    </CafePageLayout>
  );
}
