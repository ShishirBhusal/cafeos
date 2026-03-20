import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Star, 
  Clock, 
  Wifi, 
  Coffee,
  Search,
  Car,
  Sparkles,
  UtensilsCrossed,
  TrendingUp,
  Users,
  ChevronRight
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

// Using Nepal timezone utility for accurate open/closed status
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
      // Handle cafe_profiles being array or object
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
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-amber-700 via-amber-600 to-orange-500 text-white py-16 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-48 h-48 border-4 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border-4 border-white rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Coffee className="w-7 h-7" />
            </div>
            <span className="text-amber-100 font-medium">नेपालका क्याफे</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            तपाईंको अर्को चिया कहाँ?<br/>
            <span className="text-amber-200">Find Your Next Cup</span>
          </h1>
          <p className="text-amber-100 text-xl mb-8 max-w-2xl">
            Bhaktapur देखि Lalitpur सम्म — Nepal का सबैभन्दा राम्रो क्याफे एकै ठाउँमा
          </p>
          
          {/* Search Bar */}
          <form method="GET" action="/explore" className="flex flex-col sm:flex-row gap-3 max-w-3xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search cafes by name or area..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-300 focus:outline-none text-lg"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                name="area"
                defaultValue={areaFilter}
                className="w-full sm:w-48 pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-300 focus:outline-none appearance-none bg-white text-lg"
              >
                <option value="">All Areas</option>
                {areas.map((area, i) => (
                  <option key={i} value={area as string}>{area as string}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="px-6 py-4 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors flex-shrink-0">
              Search
            </button>
          </form>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-6 mt-8">
            <div className="flex items-center gap-2 text-white/90">
              <UtensilsCrossed className="w-5 h-5" />
              <span><strong>{cafeList.length}</strong> Cafes</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Users className="w-5 h-5" />
              <span><strong>{Object.values(ratingsByCafe).reduce((sum, r) => sum + r.count, 0)}</strong> Reviews</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <TrendingUp className="w-5 h-5" />
              <span><strong>{cafeList.filter((c: any) => c.isOpen).length}</strong> Open Now</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cafes */}
      {featuredCafes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Featured Today
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {featuredCafes.map((cafe: any) => (
                <Link
                  key={cafe.user_id}
                  href={`/${getSlug(cafe.business_name)}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cafe.profile?.logo_url ? (
                      <Image src={cafe.profile.logo_url} alt={cafe.business_name} width={64} height={64} className="object-cover" />
                    ) : (
                      <Coffee className="w-8 h-8 text-orange-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-orange-600">
                      {cafe.business_name}
                    </h3>
                    {cafe.profile?.daily_special_active && cafe.profile?.daily_special_name && (
                      <p className="text-sm text-amber-600 font-medium truncate">
                        ✨ {cafe.profile.daily_special_name}
                      </p>
                    )}
                    {cafe.rating && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {cafe.rating.toFixed(1)} ({cafe.reviewCount})
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cafe Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {filteredCafes.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {searchQuery || areaFilter ? 'Search Results' : 'All Cafes'}
              </h2>
              <div className="flex items-center gap-3">
                {(searchQuery || areaFilter) && (
                  <a href="/explore" className="text-sm text-orange-600 hover:underline">Clear filters</a>
                )}
                <p className="text-gray-500">{filteredCafes.length} cafe{filteredCafes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCafes.map((cafe: any) => (
                <Link 
                  key={cafe.user_id}
                  href={`/${getSlug(cafe.business_name)}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                >
                  {/* Cafe Banner */}
                  <div className="h-40 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center relative overflow-hidden">
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
                        width={80} 
                        height={80} 
                        className="object-contain"
                      />
                    ) : (
                      <Coffee className="w-16 h-16 text-orange-300" />
                    )}
                    
                    {/* Open/Closed Badge */}
                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                      cafe.isOpen 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-800 text-gray-300'
                    }`}>
                      {cafe.isOpen ? 'Open' : 'Closed'}
                    </div>
                  </div>
                  
                  {/* Cafe Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {cafe.business_name}
                      </h3>
                      {cafe.rating && (
                        <div className="flex items-center gap-1 text-sm bg-orange-50 px-2 py-0.5 rounded-full">
                          <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                          <span className="font-medium text-orange-700">{cafe.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    
                    {cafe.profile?.tagline && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-1">{cafe.profile.tagline}</p>
                    )}
                    
                    {cafe.profile?.area && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                        <MapPin className="w-4 h-4" />
                        {cafe.profile.area}{cafe.profile.city ? `, ${cafe.profile.city}` : ''}
                      </div>
                    )}
                    
                    {/* Amenity Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cafe.profile?.has_wifi && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          <Wifi className="w-3 h-3" />
                          WiFi
                        </span>
                      )}
                      {cafe.profile?.has_parking && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                          <Car className="w-3 h-3" />
                          Parking
                        </span>
                      )}
                      {cafe.profile?.has_ac && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                          <Sparkles className="w-3 h-3" />
                          AC
                        </span>
                      )}
                      {cafe.menuItemCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
                          <UtensilsCrossed className="w-3 h-3" />
                          {cafe.menuItemCount} items
                        </span>
                      )}
                    </div>
                    
                    {/* Daily Special */}
                    {cafe.profile?.daily_special_active && cafe.profile?.daily_special_name && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                        <p className="text-sm text-amber-800 font-medium">
                          ✨ Today: {cafe.profile.daily_special_name}
                        </p>
                      </div>
                    )}
                    
                    {/* View Menu Button */}
                    <div className="flex gap-2">
                      <span className="flex-1 text-center py-2.5 bg-orange-600 group-hover:bg-orange-700 text-white font-medium rounded-xl transition-colors">
                        View Menu & Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-10 h-10 text-orange-400" />
            </div>
            {searchQuery || areaFilter ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No cafes found</h2>
                <p className="text-gray-500 mb-6">
                  Try a different name or area, or{' '}
                  <a href="/explore" className="text-orange-600 hover:underline">browse all cafes</a>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Cafes Yet</h2>
                <p className="text-gray-500 mb-6">
                  Be the first cafe to join CafeOS in your area!
                </p>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
                >
                  Register Your Cafe
                </Link>
              </>
            )}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 py-16 relative overflow-hidden">
        {/* Decorative steam lines */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,30 50,50 T100,50" stroke="white" strokeWidth="0.5" fill="none" />
            <path d="M0,60 Q25,40 50,60 T100,60" stroke="white" strokeWidth="0.5" fill="none" />
            <path d="M0,70 Q25,50 50,70 T100,70" stroke="white" strokeWidth="0.5" fill="none" />
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6">
            <Coffee className="w-4 h-4" />
            CafeOS Network
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            तपाईंको क्याफे पनि CafeOS मा ल्याउनुस्
          </h2>
          <p className="text-stone-400 text-lg mb-8 max-w-2xl mx-auto">
            Free website, POS system, customer management — सबै एकै ठाउँमा।<br/>
            Nepal का 100+ cafes पहिले नै join भइसके।
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-600/20"
            >
              <UtensilsCrossed className="w-5 h-5" />
              Register गर्नुहोस् — Free
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/10"
            >
              थप जान्नुहोस्
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-8 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-500 text-sm">
          <p>© {new Date().getFullYear()} CafeOS · नेपालमा बनेको ☕</p>
          <p className="mt-2 text-stone-600">Made with love for Nepal&apos;s cafe culture</p>
        </div>
      </footer>
    </main>
  );
}
