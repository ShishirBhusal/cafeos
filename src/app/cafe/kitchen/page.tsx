import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import KitchenDisplayClient from '@/components/cafe/KitchenDisplayClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export default async function CafeKitchenPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/kitchen');
  }
  
  if (!user.capabilities.canAccessCafeKitchen) {
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

  // Fetch initial kitchen queue
  const { data: initialTickets } = await supabase
    .rpc('get_kitchen_queue', { p_cafe_id: cafeId });

  return (
    <KitchenDisplayClient 
      cafeId={cafeId}
      cafeName={cafeProfile?.business_name || 'CafeOS Kitchen'}
      initialTickets={initialTickets || []}
      userId={user.id}
    />
  );
}
