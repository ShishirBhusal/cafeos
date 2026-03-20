import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RecipesClient from '@/components/cafe/RecipesClient';

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

export default async function RecipesPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/cafe/inventory/recipes');
  }
  
  if (!user.capabilities.canAccessCafeDashboard) {
    redirect('/');
  }

  const supabase = await createClient();
  
  const { data: cafeProfile } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  const cafeId = cafeProfile?.user_id || user.id;

  // Fetch menu items
  const { data: menuItems } = await supabase
    .from('products')
    .select('id, name, base_price_cents, category_id, categories(name)')
    .eq('vendor_id', cafeId)
    .eq('is_active', true)
    .order('name');

  // Fetch ingredients
  const { data: ingredients } = await supabase
    .from('cafe_ingredients')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('is_active', true)
    .order('name');

  // Fetch existing recipes with their ingredients
  const { data: recipes } = await supabase
    .from('cafe_recipes')
    .select(`
      id,
      product_id,
      servings,
      notes,
      cafe_recipe_ingredients (
        id,
        ingredient_id,
        quantity,
        unit,
        waste_factor,
        cafe_ingredients (
          id, name, unit, purchase_price_cents, unit_size
        )
      )
    `)
    .eq('cafe_id', cafeId);

  return (
    <RecipesClient
      cafeId={cafeId}
      cafeName={cafeProfile?.business_name || 'My Cafe'}
      menuItems={(menuItems || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        price_cents: m.base_price_cents || 0,
        category: Array.isArray(m.categories) ? m.categories[0]?.name : m.categories?.name || 'Uncategorized',
      }))}
      ingredients={(ingredients || []).map(i => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        purchase_price_cents: i.purchase_price_cents || 0,
        unit_size: i.unit_size || 1,
      }))}
      initialRecipes={(recipes || []).map(r => ({
        id: r.id,
        product_id: r.product_id,
        servings: r.servings || 1,
        notes: r.notes,
        ingredients: (r.cafe_recipe_ingredients || []).map((ri: any) => ({
          id: ri.id,
          ingredient_id: ri.ingredient_id,
          quantity: ri.quantity,
          unit: ri.unit,
          waste_factor: ri.waste_factor || 1,
          ingredient_name: ri.cafe_ingredients?.name || '',
          ingredient_unit: ri.cafe_ingredients?.unit || '',
          cost_per_unit: ri.cafe_ingredients?.unit_size > 0
            ? (ri.cafe_ingredients?.purchase_price_cents || 0) / ri.cafe_ingredients.unit_size
            : 0,
        })),
      }))}
    />
  );
}
