'use client';

/**
 * Smart Inventory Insights — dashboard for the two demo algorithms.
 *
 *   Algorithm 1: KNN demand forecast  (src/lib/algorithms/knn-forecast.ts)
 *   Algorithm 2: ABC inventory analysis (src/lib/algorithms/abc-analysis.ts)
 *
 * The pure algorithm functions are imported and run right here in the browser,
 * so what the panel sees on screen is produced by the exact code in those files.
 */

import { useMemo, useState } from 'react';
import {
  Brain,
  Layers,
  TrendingUp,
  Sparkles,
  Info,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import { knnForecast, type DailySale } from '@/lib/algorithms/knn-forecast';
import type { AbcAnalysis, AbcClass } from '@/lib/algorithms/abc-analysis';

interface MenuSeries {
  productId: string;
  name: string;
  totalUnits: number;
  daily: DailySale[];
}

interface Props {
  windowDays: number;
  startDate: string;
  endDate: string;
  menuSales: MenuSeries[];
  abc: AbcAnalysis;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nextDateAfter(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function rs(paisa: number): string {
  return `Rs ${(paisa / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const CLASS_STYLE: Record<AbcClass, { chip: string; bar: string; ring: string; label: string }> = {
  A: { chip: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500', ring: 'ring-rose-200', label: 'Vital few' },
  B: { chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400', ring: 'ring-amber-200', label: 'Important' },
  C: { chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400', ring: 'ring-emerald-200', label: 'Trivial many' },
};

export default function InsightsClient({
  windowDays,
  startDate,
  endDate,
  menuSales,
  abc,
}: Props) {
  const [selectedId, setSelectedId] = useState(menuSales[0]?.productId ?? '');
  const [k, setK] = useState(5);
  const [showWork, setShowWork] = useState(false);
  const [classFilter, setClassFilter] = useState<AbcClass | 'all'>('all');

  const selected = menuSales.find((m) => m.productId === selectedId) ?? menuSales[0];

  // Run KNN for the selected item, targeting the day after the data window.
  const targetDate = selected ? nextDateAfter(selected.daily.at(-1)?.date ?? endDate) : endDate;
  const forecast = useMemo(
    () => (selected ? knnForecast(selected.daily, targetDate, k) : null),
    [selected, targetDate, k]
  );

  const targetDow = DOW_LABELS[new Date(targetDate + 'T00:00:00Z').getUTCDay()];

  // Top-line forecast for every item (next-day), for the summary strip.
  const topForecasts = useMemo(
    () =>
      menuSales.slice(0, 6).map((m) => ({
        name: m.name,
        f: knnForecast(m.daily, nextDateAfter(m.daily.at(-1)?.date ?? endDate), k),
      })),
    [menuSales, k, endDate]
  );

  const filteredAbc =
    classFilter === 'all' ? abc.items : abc.items.filter((i) => i.abcClass === classFilter);

  const maxDaily = Math.max(1, ...(selected?.daily.map((d) => d.units) ?? [1]));

  return (
    <div className="space-y-8">
      {/* Intro band */}
      <div className="rounded-2xl bg-gradient-to-br from-stone-900 to-stone-700 text-white p-6">
        <div className="flex items-center gap-2 text-stone-300 text-sm font-medium mb-1">
          <Sparkles className="w-4 h-4" />
          Smart Inventory Insights
        </div>
        <h2 className="text-2xl font-bold">Two algorithms, working on your real sales</h2>
        <p className="text-stone-300 text-sm mt-2 max-w-2xl">
          Analysing <strong className="text-white">{menuSales.length} menu items</strong> and{' '}
          <strong className="text-white">{abc.items.length} ingredients</strong> across the last{' '}
          <strong className="text-white">{windowDays} days</strong> ({startDate} → {endDate}).
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
            <Brain className="w-4 h-4" /> KNN demand forecast
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
            <Layers className="w-4 h-4" /> ABC inventory analysis
          </span>
        </div>
      </div>

      {/* ================= Algorithm 1: KNN ================= */}
      <section>
        <header className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              Algorithm 1 — KNN Demand Forecast
            </h3>
            <p className="text-sm text-stone-500">
              Predicts tomorrow&rsquo;s sales from the <em>k</em> most similar past days
              (similarity = day-of-week).
            </p>
          </div>
        </header>

        {/* Next-day forecast strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {topForecasts.map(({ name, f }) => (
            <div key={name} className="rounded-xl border border-stone-200 bg-white p-3">
              <p className="text-xs text-stone-500 truncate" title={name}>{name}</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{f.predictedUnits}</p>
              <div className="mt-1 flex items-center gap-1">
                <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${Math.round(f.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-stone-400">{Math.round(f.confidence * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive detail */}
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 justify-between border-b border-stone-100 p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-stone-500">Item</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {menuSales.map((m) => (
                  <option key={m.productId} value={m.productId}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-stone-500">Neighbours (k)</label>
              <div className="flex rounded-lg border border-stone-200 overflow-hidden">
                {[3, 5, 7].map((v) => (
                  <button
                    key={v}
                    onClick={() => setK(v)}
                    className={`px-3 py-1.5 text-sm font-medium ${
                      k === v ? 'bg-indigo-600 text-white' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selected && forecast && (
            <div className="grid lg:grid-cols-5 gap-6 p-5">
              {/* History + forecast chart */}
              <div className="lg:col-span-3">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-medium text-stone-700">
                    Daily units — last {windowDays} days
                  </p>
                  <p className="text-xs text-stone-400">
                    Forecast for {targetDate} ({targetDow})
                  </p>
                </div>
                <div className="flex items-end gap-[3px] h-40 border-b border-stone-200 pb-px">
                  {selected.daily.map((d) => {
                    const isNeighbour = forecast.neighbours.some((n) => n.date === d.date);
                    return (
                      <div
                        key={d.date}
                        className="flex-1 group relative flex items-end"
                        style={{ height: '100%' }}
                      >
                        <div
                          className={`w-full rounded-t transition-colors ${
                            isNeighbour ? 'bg-indigo-500' : 'bg-stone-200'
                          }`}
                          style={{ height: `${(d.units / maxDaily) * 100}%` }}
                        />
                        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                          {d.date.slice(5)}: {d.units}
                        </span>
                      </div>
                    );
                  })}
                  {/* forecast bar */}
                  <div className="w-3 self-stretch" />
                  <div className="flex-1 flex items-end" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-emerald-400 ring-2 ring-emerald-200"
                      style={{ height: `${(forecast.predictedUnits / maxDaily) * 100}%` }}
                      title={`Forecast: ${forecast.predictedUnits}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> Neighbour day used
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-stone-200 inline-block" /> Other days
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Forecast
                  </span>
                </div>
              </div>

              {/* Forecast readout */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Predicted for {targetDow}</p>
                  <p className="text-4xl font-bold text-emerald-700 mt-1">
                    {forecast.predictedUnits}
                    <span className="text-base font-medium text-emerald-600"> units</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-emerald-700">Confidence</span>
                    <div className="h-2 flex-1 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.round(forecast.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">
                      {Math.round(forecast.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowWork((s) => !s)}
                  className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-stone-400" />
                    Show the {forecast.k} neighbours used
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showWork ? 'rotate-90' : ''}`} />
                </button>

                {showWork && (
                  <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
                    {forecast.neighbours.map((n) => (
                      <div key={n.date} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="flex items-center gap-2 text-stone-600">
                          <CalendarDays className="w-3.5 h-3.5 text-stone-400" />
                          {n.date.slice(5)} · {DOW_LABELS[n.dayOfWeek]}
                        </span>
                        <span className="text-stone-900 font-medium">{n.units} units</span>
                        <span className="text-xs text-stone-400">w={n.weight.toFixed(2)}</span>
                      </div>
                    ))}
                    <p className="px-4 py-2 text-xs text-stone-500 bg-stone-50">
                      Prediction = distance-weighted average of these {forecast.k} days.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= Algorithm 2: ABC ================= */}
      <section>
        <header className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              Algorithm 2 — ABC Inventory Analysis
            </h3>
            <p className="text-sm text-stone-500">
              Ranks ingredients by consumption value (Pareto 80/15/5) so you know where the
              money — and the attention — should go.
            </p>
          </div>
        </header>

        {/* Class summary cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {abc.summary.map((s) => {
            const style = CLASS_STYLE[s.className];
            return (
              <button
                key={s.className}
                onClick={() => setClassFilter((c) => (c === s.className ? 'all' : s.className))}
                className={`text-left rounded-2xl border bg-white p-4 transition-all ${
                  classFilter === s.className ? `ring-2 ${style.ring}` : 'border-stone-200 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-lg ${style.chip}`}>
                    {s.className}
                  </span>
                  <span className="text-xs font-medium text-stone-400">{style.label}</span>
                </div>
                <p className="mt-3 text-2xl font-bold text-stone-900">{rs(s.valuePaisa)}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {s.valuePercent}% of value · {s.itemCount} items ({s.itemPercent}%)
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full ${style.bar}`} style={{ width: `${s.valuePercent}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Pareto bar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-stone-400" />
            <p className="text-sm font-medium text-stone-700">Consumption value by ingredient (Pareto)</p>
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {abc.items.map((it) => {
              const max = abc.items[0]?.consumptionValuePaisa || 1;
              const style = CLASS_STYLE[it.abcClass];
              return (
                <div key={it.id} className="flex-1 group relative flex items-end h-full">
                  <div
                    className={`w-full rounded-t ${style.bar} ${
                      classFilter !== 'all' && classFilter !== it.abcClass ? 'opacity-25' : ''
                    }`}
                    style={{ height: `${(it.consumptionValuePaisa / max) * 100}%` }}
                  />
                  <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100">
                    {it.name}: {rs(it.consumptionValuePaisa)} ({it.abcClass})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classified table */}
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
            <p className="font-semibold text-stone-900 text-sm">
              Ranked ingredients{classFilter !== 'all' ? ` · Class ${classFilter}` : ''} ({filteredAbc.length})
            </p>
            {classFilter !== 'all' && (
              <button onClick={() => setClassFilter('all')} className="text-xs text-stone-500 hover:text-stone-900">
                Clear filter
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Ingredient</th>
                  <th className="px-4 py-2 font-medium text-right">Usage</th>
                  <th className="px-4 py-2 font-medium text-right">Value</th>
                  <th className="px-4 py-2 font-medium text-right">% of value</th>
                  <th className="px-4 py-2 font-medium text-right">Cumulative</th>
                  <th className="px-4 py-2 font-medium text-center">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredAbc.map((it, i) => {
                  const style = CLASS_STYLE[it.abcClass];
                  return (
                    <tr key={it.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 text-stone-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-stone-900">{it.name}</td>
                      <td className="px-4 py-2.5 text-right text-stone-600">
                        {it.usageQuantity} {it.unit ?? ''}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-stone-900">
                        {rs(it.consumptionValuePaisa)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-stone-600">{it.valuePercent}%</td>
                      <td className="px-4 py-2.5 text-right text-stone-400">{it.cumulativePercent}%</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${style.chip}`}>
                          {it.abcClass}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
