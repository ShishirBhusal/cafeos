import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import StaffClient from '@/components/cafe/StaffClient';

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

export default async function CafeStaffPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  // Fetch staff list server-side
  const { data: staffData } = await supabase.rpc('get_cafe_staff', { p_cafe_id: user.id });

  return (
    <CafePageLayout title="Staff" description="Manage your team">
      <StaffClient
        cafeId={user.id}
        ownerEmail={user.email || ''}
        initialStaff={(staffData as any[]) || []}
      />
    </CafePageLayout>
  );
}
