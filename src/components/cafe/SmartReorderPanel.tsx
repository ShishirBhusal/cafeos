'use client';

/**
 * Smart Reorder Panel
 * ===================
 *
 * The user-facing surface of the two ML modules. It answers the one question a
 * cafe manager actually has at closing time: "what do I need to buy tomorrow,
 * and what am I about to run out of?"
 *
 * When the ML service is down the panel still renders, using the static
 * coverage rule, and says so plainly rather than pretending.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Brain, Loader2, RefreshCw, ShoppingCart, WifiOff } from 'lucide-react';

interface PlanLine {
  ingredient: string;
  unit: string;
  risk_class: 'URGENT' | 'WATCH' | 'SAFE';
  confidence: number | null;
  coverage_days: number | null;
  current_stock: number;
  forecast_requirement: number;
  shortfall: number;
  order_packs: number;
  order_quantity: number;
  estimated_cost_rs: number;
  order_by: string;
  reason: string;
}

interface Plan {
  degraded: boolean;
  degraded_reason?: string;
  empty?: boolean;
  message?: string;
  data_quality?: 'good' | 'sparse' | 'insufficient';
  days_of_history?: number;
  target_date?: string;
  horizon_days?: number;
  festival_effect?: string;
  lines: PlanLine[];
  summary?: {
    ingredients_reviewed: number;
    urgent: number;
    watch: number;
    to_order: number;
    estimated_total_rs: number;
  };
}

const RISK_STYLES: Record<string, { badge: string; row: string; label: string }> = {
  URGENT: {
    badge: 'bg-rose-500 text-white',
    row: 'border-l-4 border-rose-500',
    label: 'Urgent',
  },
  WATCH: {
    badge: 'bg-amber-100 text-amber-800',
    row: 'border-l-4 border-amber-400',
    label: 'Watch',
  },
  SAFE: {
    badge: 'bg-emerald-100 text-emerald-700',
    row: 'border-l-4 border-transparent',
    label: 'Safe',
  },
};

export default function SmartReorderPanel() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(7);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ml/reorder-plan?horizon=${days}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setPlan(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the reorder plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(horizon);
  }, [horizon, load]);

  const visibleLines = plan?.lines
    ? showAll
      ? plan.lines
      : plan.lines.filter((l) => l.risk_class !== 'SAFE' || l.order_packs > 0)
    : [];

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-stone-700" />
          <div>
            <h2 className="font-bold text-stone-900">Smart Reorder</h2>
            <p className="text-xs text-stone-500">
              Demand forecast + stockout risk prediction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10"
          >
            <option value={3}>Next 3 days</option>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
          </select>
          <button
            onClick={() => load(horizon)}
            disabled={loading}
            className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-50"
            aria-label="Refresh reorder plan"
          >
            <RefreshCw className={`w-4 h-4 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Degraded / quality banners */}
      {plan?.degraded && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-900">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Prediction service offline — showing the basic stock rule instead. Numbers
            will be less accurate.
          </span>
        </div>
      )}

      {plan && !plan.degraded && plan.data_quality !== 'good' && (
        <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center gap-2 text-sm text-stone-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Only {plan.days_of_history ?? 0} days of sales history found — predictions
            improve as the cafe records more orders.
          </span>
        </div>
      )}

      {/* Body */}
      {loading && !plan ? (
        <div className="p-10 flex flex-col items-center justify-center text-stone-500">
          <Loader2 className="w-7 h-7 animate-spin mb-3" />
          <p className="text-sm">Forecasting demand…</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button
            onClick={() => load(horizon)}
            className="mt-3 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800"
          >
            Try again
          </button>
        </div>
      ) : plan?.empty ? (
        <div className="p-8 text-center text-stone-500">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{plan.message}</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          {plan?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-stone-100 border-b border-stone-200">
              <Stat label="Urgent" value={plan.summary.urgent} accent="text-rose-600" />
              <Stat label="Watch" value={plan.summary.watch} accent="text-amber-600" />
              <Stat label="To order" value={plan.summary.to_order} />
              <Stat
                label="Est. cost"
                value={`Rs ${plan.summary.estimated_total_rs.toLocaleString('en-IN')}`}
              />
            </div>
          )}

          {/* Lines */}
          {visibleLines.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              <p className="text-sm font-medium text-emerald-700">
                Nothing needs ordering for the next {plan?.horizon_days ?? horizon} days.
              </p>
              <p className="text-xs mt-1">Every ingredient has enough stock.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {visibleLines.map((line) => {
                const style = RISK_STYLES[line.risk_class] ?? RISK_STYLES.SAFE;
                return (
                  <div key={line.ingredient} className={`p-4 ${style.row} hover:bg-stone-50`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-stone-900">{line.ingredient}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                            {style.label}
                          </span>
                          {line.confidence !== null && (
                            <span className="text-xs text-stone-400">
                              {Math.round(line.confidence * 100)}% confident
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-stone-500 flex-wrap">
                          <span>
                            Have <strong className="text-stone-700">{line.current_stock}</strong> {line.unit}
                          </span>
                          <span>
                            Need <strong className="text-stone-700">{line.forecast_requirement}</strong> {line.unit}
                          </span>
                          {line.coverage_days !== null && (
                            <span>
                              Lasts <strong className="text-stone-700">
                                {line.coverage_days >= 99 ? '99+' : line.coverage_days}
                              </strong> days
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-500 mt-1.5">{line.reason}</p>
                      </div>

                      {line.order_packs > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-stone-900">
                            Buy {line.order_quantity} {line.unit}
                          </p>
                          <p className="text-xs text-stone-500">
                            ≈ Rs {line.estimated_cost_rs.toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-stone-400 mt-0.5">by {line.order_by}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {plan?.lines && plan.lines.length > visibleLines.length && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-3 text-sm text-stone-600 hover:bg-stone-50 border-t border-stone-100"
            >
              Show all {plan.lines.length} ingredients
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = 'text-stone-900',
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}
