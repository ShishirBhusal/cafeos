import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Star,
  Zap,
  HelpCircle,
  ThumbsDown
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

interface MenuCostItem {
  menu_item_id: string;
  item_name: string;
  sell_price_cents: number;
  food_cost_cents: number;
  margin_cents: number;
  margin_percentage: number;
  category: string;
}

export default async function FoodCostsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/inventory/costs');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
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

  // Fetch menu cost analysis
  const { data: menuCosts } = await supabase
    .rpc('get_menu_cost_analysis', { p_cafe_id: cafeId });

  const items: MenuCostItem[] = menuCosts || [];

  // Categorize items into Stars, Workhorses, Puzzles, Dogs
  // Based on margin percentage: High (>60%), Medium (40-60%), Low (<40%)
  const stars = items.filter(i => i.margin_percentage >= 60 && i.food_cost_cents > 0);
  const workhorses = items.filter(i => i.margin_percentage >= 40 && i.margin_percentage < 60 && i.food_cost_cents > 0);
  const puzzles = items.filter(i => i.margin_percentage >= 60 && i.food_cost_cents === 0);
  const dogs = items.filter(i => i.margin_percentage < 40 && i.food_cost_cents > 0);
  const noRecipe = items.filter(i => i.food_cost_cents === 0);

  // Calculate totals
  const avgMargin = items.length > 0 
    ? items.filter(i => i.food_cost_cents > 0).reduce((sum, i) => sum + i.margin_percentage, 0) / items.filter(i => i.food_cost_cents > 0).length
    : 0;

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  const getMarginColor = (margin: number) => {
    if (margin >= 60) return 'text-green-600';
    if (margin >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginBg = (margin: number) => {
    if (margin >= 60) return 'bg-green-100';
    if (margin >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/cafe/inventory" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Food Cost Analysis</h1>
              <p className="text-sm text-gray-500">{cafeProfile?.business_name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="w-4 h-4" />
              Avg Margin
            </div>
            <div className={`text-2xl font-bold ${getMarginColor(avgMargin)}`}>
              {avgMargin.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Star className="w-4 h-4 text-yellow-500" />
              Stars
            </div>
            <div className="text-2xl font-bold text-green-600">{stars.length}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <ThumbsDown className="w-4 h-4 text-red-500" />
              Dogs
            </div>
            <div className="text-2xl font-bold text-red-600">{dogs.length}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <HelpCircle className="w-4 h-4 text-gray-500" />
              No Recipe
            </div>
            <div className="text-2xl font-bold text-gray-500">{noRecipe.length}</div>
          </div>
        </div>

        {/* Menu Performance Matrix Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-blue-800 mb-2">Menu Performance Matrix</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span><strong>Stars</strong>: High margin (≥60%) - Promote these!</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-stone-500" />
              <span><strong>Workhorses</strong>: Medium margin (40-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-500" />
              <span><strong>Puzzles</strong>: Need recipe setup</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-500" />
              <span><strong>Dogs</strong>: Low margin (&lt;40%) - Review pricing</span>
            </div>
          </div>
        </div>

        {/* Stars */}
        {stars.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-stone-900 text-white">
              <h2 className="font-bold flex items-center gap-2">
                <Star className="w-5 h-5" />
                Stars - Your Money Makers ({stars.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {stars.map(item => (
                <div key={item.menu_item_id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-500">
                        Cost: {formatPrice(item.food_cost_cents)} → Sell: {formatPrice(item.sell_price_cents)}
                      </div>
                      <span className={`px-3 py-1 rounded-full font-bold ${getMarginBg(item.margin_percentage)} ${getMarginColor(item.margin_percentage)}`}>
                        {item.margin_percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dogs - Need Attention */}
        {dogs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gradient-to-r from-red-500 to-red-600 text-white">
              <h2 className="font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Dogs - Need Price Review ({dogs.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {dogs.map(item => (
                <div key={item.menu_item_id} className="p-4 flex items-center justify-between bg-red-50">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                    <p className="text-sm text-gray-500">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-500">
                        Cost: {formatPrice(item.food_cost_cents)} → Sell: {formatPrice(item.sell_price_cents)}
                      </div>
                      <span className={`px-3 py-1 rounded-full font-bold ${getMarginBg(item.margin_percentage)} ${getMarginColor(item.margin_percentage)}`}>
                        {item.margin_percentage.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">
                      Consider increasing to {formatPrice(Math.round(item.food_cost_cents / 0.35))} for 65% margin
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items without recipes */}
        {noRecipe.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-100">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                No Recipe Linked ({noRecipe.length})
              </h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-3">
                These items don't have ingredient recipes. Link them to calculate accurate food costs.
              </p>
              <div className="flex flex-wrap gap-2">
                {noRecipe.slice(0, 10).map(item => (
                  <span key={item.menu_item_id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {item.item_name}
                  </span>
                ))}
                {noRecipe.length > 10 && (
                  <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                    +{noRecipe.length - 10} more
                  </span>
                )}
              </div>
              <Link
                href="/cafe/inventory/recipes"
                className="mt-4 inline-block px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
              >
                Set Up Recipes →
              </Link>
            </div>
          </div>
        )}

        {/* All Items Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-bold text-gray-900">All Menu Items ({items.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Item</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Food Cost</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Sell Price</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.menu_item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-sm text-gray-500">{item.category}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.food_cost_cents > 0 ? formatPrice(item.food_cost_cents) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatPrice(item.sell_price_cents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.food_cost_cents > 0 ? (
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getMarginBg(item.margin_percentage)} ${getMarginColor(item.margin_percentage)}`}>
                          {item.margin_percentage.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
