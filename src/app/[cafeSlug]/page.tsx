import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Share2, 
  Menu,
  UtensilsCrossed,
  Coffee,
  ExternalLink,
  Wifi,
  Car,
  Sparkles,
  Navigation,
  QrCode
} from 'lucide-react';
import CafeShareButton from '@/components/cafe/CafeShareButton';
import CafeQRCode from '@/components/cafe/CafeQRCode';
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

interface PageProps {
  params: Promise<{ cafeSlug: string }>;
}

interface CafeProfile {
  logo_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  description: string | null;
  address_line1: string | null;
  area: string | null;
  city: string | null;
  google_maps_url: string | null;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  has_wifi: boolean;
  has_parking: boolean;
  has_ac: boolean;
  daily_special_name: string | null;
  daily_special_price_cents: number | null;
  daily_special_active: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

// Using Nepal timezone utility for accurate open/closed status

export default async function CafeWebsitePage({ params }: PageProps) {
  const { cafeSlug } = await params;
  const supabase = await createClient();
  
  // Find cafe by slug
  const { data: allCafes } = await supabase
    .from('vendor_profiles')
    .select(`
      user_id, 
      business_name, 
      contact_email, 
      contact_phone
    `)
    .eq('verification_status', 'verified');
  
  const cafe = allCafes?.find(c => 
    c.business_name.toLowerCase().replace(/\s+/g, '-') === cafeSlug.toLowerCase()
  );
  
  if (!cafe) {
    notFound();
  }

  // Fetch cafe profile
  const { data: cafeProfile } = await supabase
    .from('cafe_profiles')
    .select('*')
    .eq('cafe_id', cafe.user_id)
    .single();

  const profile: CafeProfile = cafeProfile || {} as CafeProfile;
  const openStatus = checkIsOpenNow(profile.opening_hours);

  // Fetch approved reviews
  const { data: reviews } = await supabase
    .from('cafe_reviews')
    .select('id, rating, comment, reviewer_name, created_at')
    .eq('cafe_id', cafe.user_id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(5);

  const avgRating = reviews?.length 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Fetch menu items count
  const { count: menuItemCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', cafe.user_id)
    .eq('is_active', true);

  // Fetch categories with item counts
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category_id,
      categories(name),
      product_variants(price),
      product_images(image_url)
    `)
    .eq('vendor_id', cafe.user_id)
    .eq('is_active', true)
    .limit(6);

  const categories = [...new Set(products?.map(p => (p.categories as any)?.name).filter(Boolean))];
  const featuredItems = products?.slice(0, 3) || [];
  const slug = cafe.business_name.toLowerCase().replace(/\s+/g, '-');
  const cafeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cafeos.com.np'}/${slug}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative text-white">
        {/* Banner Image */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500">
          {profile.banner_url && (
            <Image
              src={profile.banner_url}
              alt={cafe.business_name}
              fill
              className="object-cover opacity-40"
              priority
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="relative z-10 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/explore" className="flex items-center gap-2 text-white/90 hover:text-white">
              <Coffee className="w-6 h-6" />
              <span className="font-semibold">CafeOS</span>
            </Link>
            <div className="flex items-center gap-4">
              <CafeQRCode cafeUrl={cafeUrl} cafeName={cafe.business_name} />
              <Link 
                href={`/${slug}/menu`}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                View Menu
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative pt-12 pb-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-4 mb-4">
              {/* Logo */}
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                {profile.logo_url ? (
                  <Image src={profile.logo_url} alt={cafe.business_name} width={80} height={80} className="object-cover" />
                ) : (
                  <UtensilsCrossed className="w-10 h-10 text-orange-600" />
                )}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{cafe.business_name}</h1>
                {profile.tagline && (
                  <p className="text-white/90 text-lg mt-1">{profile.tagline}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-white/80">
                  {avgRating && (
                    <>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {avgRating}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>{menuItemCount || 0} items</span>
                  {profile.area && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {profile.area}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Feature Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {profile.has_wifi && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
                  <Wifi className="w-4 h-4" /> Free WiFi
                </span>
              )}
              {profile.has_parking && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
                  <Car className="w-4 h-4" /> Parking
                </span>
              )}
              {profile.has_ac && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
                  <Sparkles className="w-4 h-4" /> AC
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 relative z-20">
              <Link
                href={`/${slug}/menu`}
                className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-colors select-none"
              >
                <Menu className="w-5 h-5" />
                See Full Menu
              </Link>
              <CafeShareButton cafeUrl={cafeUrl} cafeName={cafe.business_name} />
              {profile.google_maps_url && (
                <a
                  href={profile.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors select-none"
                >
                  <Navigation className="w-5 h-5" />
                  Directions
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path 
              fill="white" 
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            />
          </svg>
        </div>
      </div>

      {/* Daily Special Banner */}
      {profile.daily_special_active && profile.daily_special_name && (
        <div className="max-w-6xl mx-auto px-6 -mt-6 relative z-10">
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Today&apos;s Special</p>
                <p className="text-white font-bold text-lg">{profile.daily_special_name}</p>
              </div>
            </div>
            {profile.daily_special_price_cents && (
              <div className="text-white font-bold text-xl">
                Rs {Math.round(profile.daily_special_price_cents / 100)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Description */}
        {profile.description && (
          <section className="mb-12">
            <p className="text-gray-600 text-lg leading-relaxed">{profile.description}</p>
          </section>
        )}

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-orange-50 rounded-2xl p-6">
            <Clock className="w-8 h-8 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Opening Hours</h3>
            {profile.opening_hours && (
              <p className="text-gray-600 text-sm mt-1">
                {profile.opening_hours.monday?.open} - {profile.opening_hours.monday?.close}
              </p>
            )}
            <p className={`text-sm font-medium mt-1 ${openStatus.isOpen ? 'text-green-600' : 'text-red-600'}`}>
              {openStatus.isOpen ? '● Open Now' : '● Closed'} · {openStatus.nextChange}
            </p>
          </div>
          
          {cafe.contact_phone && (
            <div className="bg-blue-50 rounded-2xl p-6">
              <Phone className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Contact</h3>
              <a href={`tel:${cafe.contact_phone}`} className="text-blue-600 text-sm mt-1 hover:underline block">
                {cafe.contact_phone}
              </a>
            </div>
          )}

          {(profile.address_line1 || profile.area) && (
            <div className="bg-green-50 rounded-2xl p-6">
              <MapPin className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900">Location</h3>
              <p className="text-gray-600 text-sm mt-1">
                {profile.address_line1 && <span>{profile.address_line1}<br/></span>}
                {profile.area}, {profile.city || 'Kathmandu'}
              </p>
              {profile.google_maps_url && (
                <a 
                  href={profile.google_maps_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-600 text-sm font-medium mt-2 inline-flex items-center gap-1 hover:underline"
                >
                  <Navigation className="w-3 h-3" /> Get Directions
                </a>
              )}
            </div>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Serve</h2>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat, i) => (
                <Link
                  key={i}
                  href={`/${slug}/menu`}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 rounded-full font-medium text-gray-700 transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Popular Items</h2>
              <Link href={`/${slug}/menu`} className="text-orange-600 font-medium hover:underline flex items-center gap-1">
                View All <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredItems.map((item: any) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    {item.product_images?.[0]?.image_url ? (
                      <Image 
                        src={item.product_images[0].image_url} 
                        alt={item.name}
                        width={400}
                        height={225}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UtensilsCrossed className="w-12 h-12 text-orange-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">{item.categories?.name || 'Menu Item'}</span>
                      <span className="font-bold text-orange-600">
                        Rs {item.product_variants?.[0]?.price || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        {reviews && reviews.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold text-gray-900">{avgRating}</span>
                <span className="text-gray-500">({reviews.length} reviews)</span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.slice(0, 4).map((review: Review) => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString('en-NP', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {review.comment && <p className="text-gray-700">{review.comment}</p>}
                  {review.reviewer_name && (
                    <p className="text-sm text-gray-500 mt-2">— {review.reviewer_name}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-white/90 mb-6 max-w-md mx-auto">
            Browse our full menu and discover your new favorite dishes
          </p>
          <Link
            href={`/${slug}/menu`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
            View Complete Menu
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{cafe.business_name}</p>
                <p className="text-sm text-gray-400">Powered by CafeOS</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/explore" className="hover:text-white">Explore Cafes</Link>
              <Link href={`/${slug}/menu`} className="hover:text-white">Menu</Link>
              {cafe.contact_phone && (
                <a href={`tel:${cafe.contact_phone}`} className="hover:text-white">{cafe.contact_phone}</a>
              )}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {cafe.business_name}. Website by CafeOS.
          </div>
        </div>
      </footer>
    </div>
  );
}
