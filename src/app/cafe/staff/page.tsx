import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus,
  User,
  ChefHat,
  Receipt,
  UserCog,
  Mail,
  Shield
} from 'lucide-react';

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
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/staff');
  }
  
  if (!user.capabilities.canManageCafeStaff) {
    redirect('/');
  }

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  // For now, show a placeholder - staff management requires more complex role assignment
  // In production, this would fetch staff linked to this cafe via a cafe_staff table

  const roleIcons: Record<string, React.ReactNode> = {
    counter: <Receipt className="w-5 h-5" />,
    kitchen: <ChefHat className="w-5 h-5" />,
    waiter: <User className="w-5 h-5" />,
    cafe_manager: <UserCog className="w-5 h-5" />,
  };

  const roleColors: Record<string, string> = {
    counter: 'bg-blue-100 text-blue-800',
    kitchen: 'bg-orange-100 text-orange-800',
    waiter: 'bg-green-100 text-green-800',
    cafe_manager: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/cafe/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-sm text-gray-500">{cafeProfile?.business_name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {/* Owner Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">You (Owner)</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
              Owner
            </span>
          </div>
        </div>

        {/* Role Descriptions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">Available Roles</h2>
          <div className="space-y-3">
            {Object.entries({
              counter: 'Can access POS, take orders, process payments',
              kitchen: 'Can view and manage kitchen display',
              waiter: 'Can take orders, access POS (limited)',
              cafe_manager: 'Full access to dashboard, reports, menu',
            }).map(([role, desc]) => (
              <div key={role} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${roleColors[role]}`}>
                  {roleIcons[role]}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 capitalize">{role.replace('_', ' ')}</h4>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Staff CTA */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white text-center">
          <h3 className="text-lg font-bold mb-2">Add Staff Members</h3>
          <p className="text-orange-100 text-sm mb-4">
            Invite team members by email and assign them roles
          </p>
          <button
            className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-colors inline-flex items-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Invite Staff (Coming Soon)
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="font-medium text-blue-800 mb-2">How Staff Management Works</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Staff member creates an account on CafeOS</li>
            <li>You invite them by email from this page</li>
            <li>They accept the invitation</li>
            <li>You assign them roles (counter, kitchen, etc.)</li>
            <li>They can now access features based on their roles</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
