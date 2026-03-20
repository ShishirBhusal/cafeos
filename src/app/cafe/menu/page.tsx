import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search
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

export default async function CafeMenuPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/menu');
  }
  
  if (!user.capabilities.canManageCafeMenu) {
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

  // Fetch menu items
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      is_active,
      category_id,
      categories(name),
      product_variants(id, sku, price, is_active)
    `)
    .eq('vendor_id', cafeId)
    .order('name');

  // Group by category
  const groupedItems = (products || []).reduce((acc: any, item: any) => {
    const catName = item.categories?.name || 'Uncategorized';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {});

  const formatPrice = (price: number) => `Rs ${price.toLocaleString('en-NP')}`;

  const activeCount = (products || []).filter((p: any) => p.is_active).length;
  const totalCount = (products || []).length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/cafe/dashboard" className="p-2 hover:bg-stone-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-stone-900">Menu Management</h1>
                <p className="text-sm text-stone-500">{activeCount} active / {totalCount} total items</p>
              </div>
            </div>
            <Link
              href="/cafe/menu/new"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {Object.entries(groupedItems).length > 0 ? (
          Object.entries(groupedItems).map(([categoryName, items]: [string, any]) => (
            <div key={categoryName} className="mb-6">
              <h2 className="text-lg font-bold text-stone-900 mb-3">{categoryName}</h2>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {items.map((item: any) => (
                    <div 
                      key={item.id}
                      className={`p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-stone-900">{item.name}</h3>
                          {!item.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                              Hidden
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {(item.product_variants || []).map((v: any) => (
                            <span 
                              key={v.id}
                              className="text-sm px-2 py-1 bg-amber-50 text-amber-700 rounded-lg tabular-nums"
                            >
                              {formatPrice(v.price)}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/cafe/menu/${item.id}/edit`}
                          className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No menu items yet</h3>
            <p className="text-stone-500 mb-4">Add your first menu item to get started</p>
            <Link
              href="/cafe/menu/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add First Item
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
