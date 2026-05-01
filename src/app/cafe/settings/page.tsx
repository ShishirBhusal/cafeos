import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import {
  ArrowLeft,
  Store,
  Clock,
  QrCode,
  Bell,
  CreditCard,
  Printer,
  Wallet
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

export default async function CafeSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  
  // Get cafe profile
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name, business_type')
    .eq('user_id', user.id)
    .single();

  // Generate QR code URL for customer ordering
  const cafeSlug = cafeProfile?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'cafe';
  const qrOrderUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${cafeSlug}/menu`;

  const settingsSections = [
    {
      title: 'Cafe Profile',
      icon: <Store className="w-5 h-5" />,
      description: 'Business name, logo, contact info',
      href: '/cafe/settings/profile',
      status: 'available',
    },
    {
      title: 'Fixed Costs (हिसाब किताब)',
      icon: <Wallet className="w-5 h-5" />,
      description: 'Rent, salary, electricity for profit calculation',
      href: '/cafe/settings/fixed-costs',
      status: 'available',
    },
    {
      title: 'Operating Hours',
      icon: <Clock className="w-5 h-5" />,
      description: 'Set your opening and closing times',
      href: '/cafe/settings/hours',
      status: 'coming_soon',
    },
    {
      title: 'QR Code Setup',
      icon: <QrCode className="w-5 h-5" />,
      description: 'Generate QR codes for tables',
      href: '/cafe/settings/qr',
      status: 'coming_soon',
    },
    {
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      description: 'Order alerts, sound settings',
      href: '/cafe/settings/notifications',
      status: 'coming_soon',
    },
    {
      title: 'Payment Methods',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'eSewa, Khalti, cash settings',
      href: '/cafe/settings/payments',
      status: 'coming_soon',
    },
    {
      title: 'Printer Setup',
      icon: <Printer className="w-5 h-5" />,
      description: 'Receipt and kitchen ticket printing',
      href: '/cafe/settings/printer',
      status: 'coming_soon',
    },
  ];

  return (
    <CafePageLayout title="Settings" description="Cafe settings">
      <div className="space-y-4">
        {/* QR Code Quick Access */}
        <div className="bg-stone-900 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <QrCode className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Customer Ordering URL</h3>
              <p className="text-stone-300 text-sm break-all">{qrOrderUrl}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-stone-300">
            Share this link or print QR codes for customers to order from their phones
          </p>
        </div>

        {/* Settings List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {settingsSections.map((section, index) => (
            <div key={section.title}>
              {section.status === 'available' ? (
                <Link
                  href={section.href}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </Link>
              ) : (
                <div className="flex items-center gap-4 p-4 opacity-50">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
                    Coming Soon
                  </span>
                </div>
              )}
              {index < settingsSections.length - 1 && (
                <div className="border-b border-gray-100 ml-16" />
              )}
            </div>
          ))}
        </div>

        {/* App Info */}
        <div className="text-center py-4 text-sm text-gray-500">
          <p>CafeOS v1.0</p>
          <p className="text-xs mt-1">Built with ❤️ for Nepali cafes</p>
        </div>
      </div>
    </CafePageLayout>
  );
}
