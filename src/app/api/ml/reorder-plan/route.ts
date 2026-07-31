/**
 * CafeOS — Intelligent Reorder Plan
 * =================================
 *
 * Bridges the CafeOS web application to the Python ML service.
 *
 *   1. Reads the cafe's live ingredient list from Supabase.
 *   2. Reconstructs each ingredient's recent daily consumption by replaying
 *      recent orders through the recipe book.
 *   3. Asks the ML service for a demand forecast + stockout-risk classification
 *      and turns both into a purchase list.
 *
 * DEGRADED MODE
 * -------------
 * If the ML service is unreachable, this route does NOT fail. It falls back to
 * the static coverage-threshold heuristic that CafeOS used before the models
 * existed, and marks the response `degraded: true` so the UI can say so. An
 * inventory screen that goes blank because a Python process died is worse than
 * one showing a weaker prediction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000';
const ML_TIMEOUT_MS = 8000;
const HISTORY_DAYS = 28;

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
            // Server Component limitation
          }
        },
      },
    }
  );
}

interface IngredientRow {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  purchase_price_cents: number;
  unit_size: number | null;
}

/** Daily consumption per ingredient, reconstructed from orders x recipes. */
function buildConsumptionSeries(
  orderItems: Array<{ created_at: string; quantity: number; product_id: string }>,
  recipeMap: Map<string, Array<{ ingredient_id: string; quantity: number; waste_factor: number }>>,
  ingredientIds: string[],
): { series: Map<string, number[]>; daysCovered: number } {
  const byDay = new Map<string, Map<string, number>>();

  for (const oi of orderItems) {
    const day = oi.created_at.slice(0, 10);
    const components = recipeMap.get(oi.product_id);
    if (!components) continue;

    if (!byDay.has(day)) byDay.set(day, new Map());
    const dayMap = byDay.get(day)!;

    for (const c of components) {
      const used = c.quantity * oi.quantity * (1 + (c.waste_factor ?? 0));
      dayMap.set(c.ingredient_id, (dayMap.get(c.ingredient_id) ?? 0) + used);
    }
  }

  const days = Array.from(byDay.keys()).sort().slice(-HISTORY_DAYS);
  const series = new Map<string, number[]>();

  for (const id of ingredientIds) {
    series.set(id, days.map((d) => byDay.get(d)?.get(id) ?? 0));
  }

  return { series, daysCovered: days.length };
}

/** The pre-ML heuristic, kept as the degraded-mode fallback. */
function staticRuleFallback(ingredients: IngredientRow[], series: Map<string, number[]>) {
  return ingredients.map((ing) => {
    const hist = series.get(ing.id) ?? [];
    const recent = hist.slice(-7);
    const mean7 = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const coverage = mean7 > 0 ? ing.current_stock / mean7 : 99;

    const risk_class = coverage <= 3 ? 'URGENT' : coverage <= 7 ? 'WATCH' : 'SAFE';
    const requirement = mean7 * 7;
    const shortfall = Math.max(0, requirement - ing.current_stock);

    return {
      ingredient: ing.name,
      unit: ing.unit,
      risk_class,
      confidence: null,
      coverage_days: Number(coverage.toFixed(2)),
      current_stock: ing.current_stock,
      forecast_requirement: Number(requirement.toFixed(2)),
      shortfall: Number(shortfall.toFixed(2)),
      order_packs: shortfall > 0 ? Math.ceil(shortfall / (ing.unit_size || 1)) : 0,
      order_quantity: Number(shortfall.toFixed(2)),
      estimated_cost_rs: Number(
        ((shortfall / (ing.unit_size || 1)) * (ing.purchase_price_cents / 100)).toFixed(2),
      ),
      order_by: new Date().toISOString().slice(0, 10),
      reason: 'Static coverage rule (ML service unavailable).',
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const horizonDays = Math.min(
      14,
      Math.max(1, Number(request.nextUrl.searchParams.get('horizon') ?? 7)),
    );

    const { data: cafeProfile } = await supabase
      .from('vendor_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    const cafeId = cafeProfile?.user_id ?? user.id;

    // --- 1. ingredients -----------------------------------------------------
    const { data: ingredients } = await supabase
      .from('cafe_ingredients')
      .select('id, name, unit, current_stock, min_stock_level, purchase_price_cents, unit_size')
      .eq('cafe_id', cafeId)
      .eq('is_active', true);

    if (!ingredients?.length) {
      return NextResponse.json({
        degraded: false,
        empty: true,
        message: 'No active ingredients found. Add ingredients in Saman Hisab first.',
        lines: [],
      });
    }

    // --- 2. recipe book -----------------------------------------------------
    const { data: recipes } = await supabase
      .from('cafe_recipes')
      .select('id, product_id, servings, cafe_recipe_ingredients(ingredient_id, quantity, waste_factor)')
      .eq('cafe_id', cafeId);

    const recipeMap = new Map<
      string,
      Array<{ ingredient_id: string; quantity: number; waste_factor: number }>
    >();
    for (const r of recipes ?? []) {
      const servings = (r as { servings?: number }).servings || 1;
      const comps = ((r as { cafe_recipe_ingredients?: Array<{ ingredient_id: string; quantity: number; waste_factor: number }> })
        .cafe_recipe_ingredients ?? []).map((c) => ({
        ingredient_id: c.ingredient_id,
        quantity: c.quantity / servings,
        waste_factor: c.waste_factor ?? 0,
      }));
      if (comps.length) recipeMap.set((r as { product_id: string }).product_id, comps);
    }

    // --- 3. recent order history -------------------------------------------
    // Use the most recent HISTORY_DAYS of activity that actually exists. On a
    // freshly seeded database the newest orders may be older than today, so we
    // do not filter to "the last 28 calendar days" -- we take the last 28 days
    // that contain data and report how much coverage we found.
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('created_at, quantity, product_id, orders!inner(vendor_id)')
      .eq('orders.vendor_id', cafeId)
      .order('created_at', { ascending: false })
      .limit(6000);

    const normalisedItems = (orderItems ?? []).map((oi) => ({
      created_at: String((oi as { created_at: string }).created_at),
      quantity: Number((oi as { quantity: number }).quantity) || 0,
      product_id: String((oi as { product_id: string }).product_id),
    }));

    const { series, daysCovered } = buildConsumptionSeries(
      normalisedItems,
      recipeMap,
      ingredients.map((i) => i.id),
    );

    const dataQuality =
      daysCovered >= 21 ? 'good' : daysCovered >= 7 ? 'sparse' : 'insufficient';

    // --- 4. call the ML service --------------------------------------------
    const payload = {
      target_date: new Date().toISOString().slice(0, 10),
      horizon_days: horizonDays,
      items: [] as unknown[],
      ingredients: (ingredients as IngredientRow[]).map((ing) => ({
        ingredient: ing.name,
        unit: ing.unit,
        opening_stock: Number(ing.current_stock) || 0,
        recent_consumption: series.get(ing.id) ?? [],
        shelf_life_days: 30,
        supplier_lead_time_days: 2,
        pack_price_rs: (Number(ing.purchase_price_cents) || 0) / 100,
        days_since_purchase: 3,
        incoming_qty_7d: 0,
      })),
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

      const res = await fetch(`${ML_SERVICE_URL}/reorder-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`ML service returned ${res.status}`);

      const plan = await res.json();
      return NextResponse.json({
        ...plan,
        degraded: false,
        data_quality: dataQuality,
        days_of_history: daysCovered,
      });
    } catch (mlError) {
      console.warn('[ml/reorder-plan] ML service unavailable, using static rule:', mlError);

      const lines = staticRuleFallback(ingredients as IngredientRow[], series);
      lines.sort((a, b) => {
        const rank = { URGENT: 0, WATCH: 1, SAFE: 2 } as Record<string, number>;
        return rank[a.risk_class] - rank[b.risk_class] || b.shortfall - a.shortfall;
      });

      return NextResponse.json({
        degraded: true,
        degraded_reason: 'ML service unreachable — showing static coverage rule.',
        data_quality: dataQuality,
        days_of_history: daysCovered,
        target_date: new Date().toISOString().slice(0, 10),
        horizon_days: horizonDays,
        lines,
        summary: {
          ingredients_reviewed: lines.length,
          urgent: lines.filter((l) => l.risk_class === 'URGENT').length,
          watch: lines.filter((l) => l.risk_class === 'WATCH').length,
          to_order: lines.filter((l) => l.order_packs > 0).length,
          estimated_total_rs: Number(
            lines.reduce((s, l) => s + (l.order_packs > 0 ? l.estimated_cost_rs : 0), 0).toFixed(2),
          ),
        },
      });
    }
  } catch (error) {
    console.error('[ml/reorder-plan] fatal:', error);
    return NextResponse.json({ error: 'Failed to build reorder plan' }, { status: 500 });
  }
}
