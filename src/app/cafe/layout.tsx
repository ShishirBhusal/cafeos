import { Toaster } from 'react-hot-toast';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CafeLayoutShell from '@/components/cafe/CafeLayoutShell';

async function getCafeInfo(userId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  // Check if user owns a cafe
  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', userId)
    .single();

  if (vendorProfile) {
    const slug = vendorProfile.business_name
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      cafeId: vendorProfile.user_id,
      cafeName: vendorProfile.business_name || 'My Cafe',
      cafeSlug: slug,
    };
  }

  // Check if user is staff
  const { data: staffAssignment } = await supabase
    .from('staff_assignments')
    .select('cafe_id, vendor_profiles(user_id, business_name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (staffAssignment?.vendor_profiles) {
    const vp = staffAssignment.vendor_profiles as any;
    return {
      cafeId: staffAssignment.cafe_id,
      cafeName: vp.business_name || 'My Cafe',
      cafeSlug: undefined,
    };
  }

  return null;
}

export default async function CafeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirect=/cafe/dashboard');
  }

  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const cafeInfo = await getCafeInfo(user.id);

  if (!cafeInfo) {
    redirect('/');
  }

  return (
    <>
      <CafeLayoutShell
        cafeId={cafeInfo.cafeId}
        cafeName={cafeInfo.cafeName}
        cafeSlug={cafeInfo.cafeSlug}
      >
        {children}
      </CafeLayoutShell>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1c1917',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
    </>
  );
}
