import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Star,
  Wifi,
  Coffee,
  Search,
  Car,
  Sparkles,
  UtensilsCrossed,
  ArrowLeft
} from 'lucide-react';
import { isOpenNow as checkIsOpenNow } from '@/lib/nepalTime';

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

interface CafeWithProfile {
  user_id: string;
  business_name: string;
  business_type: string | null;
  contact_phone: string | null;
  cafe_profiles: {
    logo_url: string | null;
    banner_url: string | null;
    tagline: string | null;
    area: string | null;
    city: string | null;
    has_wifi: boolean;
    has_parking: boolean;
    has_ac: boolean;
    daily_special_name: string | null;
    daily_special_active: boolean;
    opening_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  } | null;
}

function isOpenNow(hours: Record<string, { open: string; close: string; closed: boolean }> | null): boolean {
  return checkIsOpenNow(hours).isOpen;
}

interface PageProps {
  searchParams: Promise<{ q?: string; area?: string }>;
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const { q: searchQuery = '', area: areaFilter = '' } = await searchParams;
  const supabase = await createClient();

  // Fetch all verified cafes with their profiles
  const { data: cafes } = await supabase
    .from('vendor_profiles')
    .select(`
      user_id,
      business_name,
      business_type,
      contact_phone,
      cafe_profiles (
        logo_url,
        banner_url,
        tagline,
        area,
        city,
        has_wifi,
        has_parking,
        has_ac,
        daily_special_name,
        daily_special_active,
        opening_hours
      )
    `)
    .eq('verification_status', 'verified')
    .order('business_name');

  // Fetch review stats for all cafes
  const { data: reviewStats } = await supabase
    .from('cafe_reviews')
    .select('cafe_id, rating')
    .eq('is_approved', true);

  // Calculate average ratings per cafe
  const ratingsByCafe: Record<string, { avg: number; count: number }> = {};
  (reviewStats || []).forEach((r: { cafe_id: string; rating: number }) => {
    if (!ratingsByCafe[r.cafe_id]) {
      ratingsByCafe[r.cafe_id] = { avg: 0, count: 0 };
    }
    ratingsByCafe[r.cafe_id].count++;
    ratingsByCafe[r.cafe_id].avg =
      (ratingsByCafe[r.cafe_id].avg * (ratingsByCafe[r.cafe_id].count - 1) + r.rating) / ratingsByCafe[r.cafe_id].count;
  });

  // Fetch menu item counts
  const { data: menuCounts } = await supabase
    .from('products')
    .select('vendor_id')
    .eq('is_active', true);

  const itemCountByCafe: Record<string, number> = {};
  (menuCounts || []).forEach((p: { vendor_id: string }) => {
    itemCountByCafe[p.vendor_id] = (itemCountByCafe[p.vendor_id] || 0) + 1;
  });

  // Filter cafe-type businesses and enrich with data
  const cafeList = (cafes || [])
    .filter((c: any) => {
      const type = c.business_type?.toLowerCase() || '';
      return type === 'cafe' ||
             type.includes('cafe') ||
             type.includes('restaurant') ||
             type.includes('tea') ||
             type.includes('coffee') ||
             type.includes('chiya');
    })
    .map((cafe: any) => {
      const profile = Array.isArray(cafe.cafe_profiles)
        ? cafe.cafe_profiles[0]
        : cafe.cafe_profiles;
      return {
        ...cafe,
        profile,
        rating: ratingsByCafe[cafe.user_id]?.avg || null,
        reviewCount: ratingsByCafe[cafe.user_id]?.count || 0,
        menuItemCount: itemCountByCafe[cafe.user_id] || 0,
        isOpen: isOpenNow(profile?.opening_hours || null),
      };
    });

  cafeList.sort((a: any, b: any) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    if (a.rating && b.rating) return b.rating - a.rating;
    if (a.rating) return -1;
    if (b.rating) return 1;
    return 0;
  });

  const getSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const areas = [...new Set(cafeList.map((c: any) => c.profile?.area).filter(Boolean))];

  const filteredCafes = cafeList.filter((c: any) => {
    const matchesSearch = !searchQuery ||
      c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.profile?.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.profile?.area?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = !areaFilter || c.profile?.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const featuredCafes = (!searchQuery && !areaFilter)
    ? cafeList.filter((c: any) =>
        c.profile?.daily_special_active || (c.rating && c.rating >= 4)
      ).slice(0, 3)
    : [];

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
            <div className="h-4 w-px bg-stone-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
                <Coffee className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-stone-900">Explore</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-stone-600 hover:text-stone-800 font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login?mode=signup"
              className="text-sm bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              List your cafe
            </Link>
          </div>
        </div>
      </nav>

      {/* Search Section */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Find your next cup
          </h1>
          <p className="text-stone-500 mb-6">
            Discover cafes across Nepal — {cafeList.length} cafes, {cafeList.filter((c: any) => c.isOpen).length} open now
          </p>

          <form method="GET" action="/explore" className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by name or area..."
                className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
              />
            </div>
            {areas.length > 0 && (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <select
                  name="area"
                  defaultValue={areaFilter}
                  className="w-full sm:w-44 pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 appearance-none bg-white"
                >
                  <option value="">All areas</option>
                  {areas.map((area, i) => (
                    <option key={i} value={area as string}>{area as string}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors">
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Featured Cafes */}
        {featuredCafes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
              Featured today
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {featuredCafes.map((cafe: any) => (
                <Link
                  key={cafe.user_id}
                  href={`/${getSlug(cafe.business_name)}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 transition-colors group"
                >
                  <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cafe.profile?.logo_url ? (
                      <Image src={cafe.profile.logo_url} alt={cafe.business_name} width={56} height={56} className="object-cover" />
                    ) : (
                      <Coffee className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900 truncate group-hover:text-stone-700">
                      {cafe.business_name}
                    </h3>
                    {cafe.profile?.daily_special_active && cafe.profile?.daily_special_name ? (
                      <p className="text-sm text-emerald-600 font-medium truncate">
                        {cafe.profile.daily_special_name}
                      </p>
                    ) : cafe.rating ? (
                      <div className="flex items-center gap-1 text-sm text-stone-500">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        {cafe.rating.toFixed(1)} ({cafe.reviewCount})
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cafe Grid */}
        {filteredCafes.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-stone-900">
                {searchQuery || areaFilter ? 'Results' : 'All cafes'}
              </h2>
              <div className="flex items-center gap-3">
                {(searchQuery || areaFilter) && (
                  <a href="/explore" className="text-sm text-stone-600 hover:text-stone-900 underline">Clear</a>
                )}
                <p className="text-sm text-stone-500">{filteredCafes.length} cafe{filteredCafes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCafes.map((cafe: any) => (
                <Link
                  key={cafe.user_id}
                  href={`/${getSlug(cafe.business_name)}`}
                  className="bg-white rounded-xl overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all group"
                >
                  {/* Banner */}
                  <div className="h-36 bg-stone-100 flex items-center justify-center relative overflow-hidden">
                    {cafe.profile?.banner_url ? (
                      <Image
                        src={cafe.profile.banner_url}
                        alt={cafe.business_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : cafe.profile?.logo_url ? (
                      <Image
                        src={cafe.profile.logo_url}
                        alt={cafe.business_name}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    ) : (
                      <Coffee className="w-12 h-12 text-stone-300" />
                    )}

                    <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium ${
                      cafe.isOpen
                        ? 'bg-emerald-500 text-white'
                        : 'bg-stone-800 text-stone-300'
                    }`}>
                      {cafe.isOpen ? 'Open' : 'Closed'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-stone-900">
                        {cafe.business_name}
                      </h3>
                      {cafe.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-stone-700">{cafe.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {cafe.profile?.tagline && (
                      <p className="text-sm text-stone-500 mb-2 line-clamp-1">{cafe.profile.tagline}</p>
                    )}

                    {cafe.profile?.area && (
                      <div className="flex items-center gap-1 text-sm text-stone-500 mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        {cafe.profile.area}{cafe.profile.city ? `, ${cafe.profile.city}` : ''}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {cafe.profile?.has_wifi && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-lg">
                          <Wifi className="w-3 h-3" /> WiFi
                        </span>
                      )}
                      {cafe.profile?.has_parking && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-lg">
                          <Car className="w-3 h-3" /> Parking
                        </span>
                      )}
                      {cafe.profile?.has_ac && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-lg">
                          <Sparkles className="w-3 h-3" /> AC
                        </span>
                      )}
                      {cafe.menuItemCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-lg">
                          <UtensilsCrossed className="w-3 h-3" /> {cafe.menuItemCount} items
                        </span>
                      )}
                    </div>

                    {/* Daily Special */}
                    {cafe.profile?.daily_special_active && cafe.profile?.daily_special_name && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-4">
                        <p className="text-sm text-emerald-700 font-medium">
                          Today: {cafe.profile.daily_special_name}
                        </p>
                      </div>
                    )}

                    <span className="block text-center py-2 bg-stone-900 text-white text-sm font-medium rounded-lg group-hover:bg-stone-800 transition-colors">
                      View menu
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-8 h-8 text-stone-400" />
            </div>
            {searchQuery || areaFilter ? (
              <>
                <h2 className="text-lg font-semibold text-stone-900 mb-1">No cafes found</h2>
                <p className="text-stone-500 mb-4 text-sm">
                  Try a different search or{' '}
                  <a href="/explore" className="text-stone-900 underline">browse all</a>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-stone-900 mb-1">No cafes yet</h2>
                <p className="text-stone-500 mb-4 text-sm">
                  Be the first cafe to join CafeOS
                </p>
                <Link
                  href="/auth/login?mode=signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Register your cafe
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="bg-stone-900 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Own a cafe? Join CafeOS
          </h2>
          <p className="text-stone-400 mb-7">
            Free POS, kitchen display, QR ordering, and reports. Everything you need to run your cafe.
          </p>
          <Link
            href="/auth/login?mode=signup"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-white hover:bg-stone-100 text-stone-900 font-medium rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-stone-400">
          <p>&copy; {new Date().getFullYear()} CafeOS. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
