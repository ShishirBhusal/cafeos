/**
 * Data shaping for the inventory algorithms.
 * ==========================================
 *
 * Turns raw Supabase rows (orders, recipes, ingredients) into the clean inputs
 * that `knn-forecast` and `abc-analysis` expect. Kept separate from the
 * algorithms so those stay pure and unit-testable, and so all the SQL-ish
 * joining lives in one place.
 *
 * Runs on the server (called from a Server Component).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DailySale } from './knn-forecast';
import type { AbcInput } from './abc-analysis';

export interface MenuItemSales {
  productId: string;
  name: string;
  totalUnits: number;
  /** One entry per calendar day the item sold (zero-filled across the window). */
  daily: DailySale[];
}

export interface InventoryDataset {
  windowDays: number;
  startDate: string;
  endDate: string;
  orderCount: number;
  menuSales: MenuItemSales[];
  abcInputs: AbcInput[];
  /** ingredientId → cost of one tracking unit in paisa (for reuse by callers). */
  ingredientUnitCost: Record<string, { name: string; unit: string; unitCostPaisa: number }>;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Load and shape everything the insights dashboard needs.
 *
 * @param supabase Authenticated server client.
 * @param cafeId   Cafe (vendor) id.
 * @param windowDays Trailing window to analyse (default 28 days).
 */
export async function loadInventoryDataset(
  supabase: SupabaseClient,
  cafeId: string,
  windowDays = 28
): Promise<InventoryDataset> {
  // Anchor the window on the most recent day the cafe actually traded, not on
  // today. A cafe that was closed for a stretch (or a demo database whose seed
  // data is older than the calendar window) still gets a meaningful analysis
  // instead of an empty screen. When trading is current, this is identical to
  // "the last `windowDays` days".
  const { data: latestRow } = await supabase
    .from('order_items')
    .select('created_at')
    .eq('vendor_id', cafeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = new Date();
  const latestTraded = latestRow?.created_at ? new Date(latestRow.created_at as string) : today;
  // Never anchor in the future; otherwise use the later of the two is wrong —
  // we want the most recent *trading* day, capped at today.
  const end = latestTraded < today ? latestTraded : today;

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  const startIso = isoDate(start);
  const endIso = isoDate(end);

  // --- 1. Sold order-items in the window -----------------------------------
  // PostgREST returns at most 1000 rows per request, so page until exhausted.
  // Without this a busy cafe silently loses the tail of its history and the
  // dropped days look like zero-sales days to the forecast.
  const PAGE = 1000;
  const endExclusive = isoDate(new Date(end.getTime() + 86400000));
  const items: { product_id: string; product_name: string; quantity: number; created_at: string }[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data: page, error } = await supabase
      .from('order_items')
      .select('product_id, product_name, quantity, created_at')
      .eq('vendor_id', cafeId)
      .gte('created_at', startIso)
      .lt('created_at', endExclusive)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error || !page || page.length === 0) break;
    items.push(...(page as typeof items));
    if (page.length < PAGE) break;
  }

  // Distinct calendar days actually covered by data, plus a zero-filled spine so
  // KNN sees "sold nothing" days too (important — a quiet Monday is signal).
  const dayKeys: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    dayKeys.push(isoDate(d));
  }

  // productId → { name, perDay: Map<date, units> }
  const byProduct = new Map<string, { name: string; perDay: Map<string, number> }>();
  const orderIds = new Set<string>();
  for (const it of items) {
    if (!it.product_id) continue;
    const pid = it.product_id as string;
    if (!byProduct.has(pid)) {
      byProduct.set(pid, { name: (it.product_name as string) || 'Item', perDay: new Map() });
    }
    const day = (it.created_at as string).slice(0, 10);
    const bucket = byProduct.get(pid)!;
    bucket.perDay.set(day, (bucket.perDay.get(day) ?? 0) + (Number(it.quantity) || 0));
  }

  // Drop a trailing partial day. The most recent day is often captured
  // mid-service (the cafe is still open, or the export stopped part-way), and a
  // half-recorded day is not a low-demand day — feeding it to the forecast as if
  // it were would bias every prediction downwards. Rule: if the last day's total
  // is under half the median of the other days, treat it as incomplete.
  const dayTotals = dayKeys.map((d) =>
    [...byProduct.values()].reduce((s, b) => s + (b.perDay.get(d) ?? 0), 0)
  );
  const effectiveDayKeys = [...dayKeys];
  if (dayTotals.length > 2) {
    const head = dayTotals.slice(0, -1).filter((t) => t > 0).sort((a, b) => a - b);
    const median = head.length ? head[Math.floor(head.length / 2)] : 0;
    const last = dayTotals[dayTotals.length - 1];
    if (median > 0 && last < median * 0.5) effectiveDayKeys.pop();
  }

  const menuSales: MenuItemSales[] = [...byProduct.entries()]
    .map(([productId, { name, perDay }]) => {
      const daily = effectiveDayKeys.map((date) => ({ date, units: perDay.get(date) ?? 0 }));
      const totalUnits = daily.reduce((s, d) => s + d.units, 0);
      return { productId, name, totalUnits, daily };
    })
    .filter((m) => m.totalUnits > 0)
    .sort((a, b) => b.totalUnits - a.totalUnits);

  // --- 2. Recipes → ingredient usage ---------------------------------------
  // Replay each product's total units through its recipe to estimate how much of
  // every ingredient was consumed in the window.
  const { data: recipeRows } = await supabase
    .from('cafe_recipes')
    .select(
      `product_id, servings,
       cafe_recipe_ingredients (
         ingredient_id, quantity, waste_factor,
         cafe_ingredients ( id, name, unit, purchase_price_cents, unit_size, is_active )
       )`
    )
    .eq('cafe_id', cafeId);

  const soldByProduct = new Map<string, number>();
  for (const m of menuSales) soldByProduct.set(m.productId, m.totalUnits);

  // ingredientId → usage in tracking units, plus cost metadata.
  const usage = new Map<string, number>();
  const ingredientUnitCost: InventoryDataset['ingredientUnitCost'] = {};

  for (const r of recipeRows ?? []) {
    const productUnitsSold = soldByProduct.get(r.product_id as string) ?? 0;
    const servings = Number(r.servings) || 1;
    const lines = (r.cafe_recipe_ingredients as any[]) ?? [];
    for (const line of lines) {
      const ing = line.cafe_ingredients;
      if (!ing || ing.is_active === false) continue;
      const perServing = (Number(line.quantity) || 0) * (Number(line.waste_factor) || 1);
      const consumed = (perServing / servings) * productUnitsSold;
      usage.set(ing.id, (usage.get(ing.id) ?? 0) + consumed);

      if (!ingredientUnitCost[ing.id]) {
        const size = Number(ing.unit_size) > 0 ? Number(ing.unit_size) : 1;
        ingredientUnitCost[ing.id] = {
          name: ing.name,
          unit: ing.unit,
          unitCostPaisa: (Number(ing.purchase_price_cents) || 0) / size,
        };
      }
    }
  }

  // --- 3. ABC inputs -------------------------------------------------------
  const abcInputs: AbcInput[] = [...usage.entries()]
    .map(([id, usageQuantity]) => {
      const meta = ingredientUnitCost[id];
      return {
        id,
        name: meta?.name ?? 'Ingredient',
        unit: meta?.unit,
        usageQuantity: Math.round(usageQuantity * 100) / 100,
        unitCostPaisa: meta?.unitCostPaisa ?? 0,
      };
    })
    .filter((x) => x.usageQuantity > 0);

  return {
    windowDays,
    startDate: startIso,
    endDate: effectiveDayKeys[effectiveDayKeys.length - 1] ?? endIso,
    orderCount: orderIds.size || items.length,
    menuSales,
    abcInputs,
    ingredientUnitCost,
  };
}

/**
 * Real per-menu-item food cost & margin.
 *
 * Replaces the legacy `get_menu_cost_analysis` RPC, which read an empty table and
 * reported every item at 100% margin. Costs come from the live cafe_recipes /
 * cafe_recipe_ingredients / cafe_ingredients tables; the sell price is the
 * cheapest active product variant (cafe products keep price on the variant, not
 * on products.base_price_cents).
 */
export interface MenuCostRow {
  menu_item_id: string;
  item_name: string;
  category: string;
  sell_price_cents: number;
  food_cost_cents: number;
  margin_cents: number;
  margin_percentage: number;
  has_recipe: boolean;
}

export async function getMenuCostAnalysis(
  supabase: SupabaseClient,
  cafeId: string
): Promise<MenuCostRow[]> {
  const { data: products } = await supabase
    .from('products')
    .select(
      `id, name, categories(name),
       product_variants(price, is_active),
       cafe_recipes!left (
         servings,
         cafe_recipe_ingredients (
           quantity, waste_factor,
           cafe_ingredients ( purchase_price_cents, unit_size, is_active )
         )
       )`
    )
    .eq('vendor_id', cafeId)
    .eq('is_active', true)
    .order('name');

  return (products ?? []).map((p: any): MenuCostRow => {
    const prices = (p.product_variants ?? [])
      .filter((v: any) => v.is_active !== false && v.price != null)
      .map((v: any) => Math.round(Number(v.price) * 100));
    const sell = prices.length ? Math.min(...prices) : 0;

    // A product may have at most one recipe here; take the first if present.
    const recipe = Array.isArray(p.cafe_recipes) ? p.cafe_recipes[0] : p.cafe_recipes;
    let foodCost = 0;
    let hasRecipe = false;
    if (recipe) {
      const servings = Number(recipe.servings) || 1;
      const lines = recipe.cafe_recipe_ingredients ?? [];
      if (lines.length > 0) {
        hasRecipe = true;
        foodCost =
          lines.reduce((sum: number, line: any) => {
            const ing = line.cafe_ingredients;
            if (!ing || ing.is_active === false) return sum;
            const size = Number(ing.unit_size) > 0 ? Number(ing.unit_size) : 1;
            const costPerUnit = (Number(ing.purchase_price_cents) || 0) / size;
            return sum + (Number(line.quantity) || 0) * (Number(line.waste_factor) || 1) * costPerUnit;
          }, 0) / servings;
      }
    }

    foodCost = Math.round(foodCost);
    const margin = sell - foodCost;
    const cats = p.categories;
    return {
      menu_item_id: p.id,
      item_name: p.name,
      category: (Array.isArray(cats) ? cats[0]?.name : cats?.name) || 'Uncategorized',
      sell_price_cents: sell,
      food_cost_cents: foodCost,
      margin_cents: margin,
      margin_percentage: sell > 0 ? Math.round((margin / sell) * 1000) / 10 : 0,
      has_recipe: hasRecipe,
    };
  });
}
