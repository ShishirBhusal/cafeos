'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, AlertTriangle, CheckCircle2, Banknote, Smartphone, Calculator, TrendingUp, TrendingDown, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShiftData {
  shift_id: string;
  opened_at: string;
  opening_float_cents: number;
  current_cash_cents: number;
  order_count: number;
}

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftClosed: () => void;
  cafeId: string;
  shiftData: ShiftData;
}

interface ShiftSummary {
  total_sales_cents: number;
  cash_sales_cents: number;
  digital_sales_cents: number;
  opening_float_cents: number;
  expected_cash_cents: number;
  actual_cash_cents: number;
  variance_cents: number;
}

interface WaterfallItem {
  label: string;
  label_np: string;
  amount_cents: number;
  type: 'start' | 'income' | 'info' | 'expense' | 'total';
}

interface CashFlowData {
  waterfall: WaterfallItem[];
  expected_cash_cents: number;
  cash_sales_cents: number;
  digital_sales_cents: number;
  expenses_cents: number;
}

interface VarianceTrendData {
  shifts: { date: string; variance_cents: number }[];
  avg_variance_cents: number;
  total_variance_cents: number;
  shift_count: number;
  is_improving: boolean;
}

function MiniSparkline({ data }: { data: { variance_cents: number }[] }) {
  if (data.length < 2) return null;
  const values = data.map(d => d.variance_cents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 32;
  const w = Math.min(data.length * 12, 180);
  const step = w / (data.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const zeroY = h - ((0 - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="inline-block">
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#d1d5db" strokeWidth="1" strokeDasharray="3,3" />
      <polyline fill="none" stroke="#78716c" strokeWidth="2" points={points} />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={parseFloat(points.split(' ')[i]?.split(',')[1] || '0')} r="3"
          fill={v >= 0 ? '#22c55e' : '#ef4444'} />
      ))}
    </svg>
  );
}

export default function CloseShiftModal({
  isOpen,
  onClose,
  onShiftClosed,
  cafeId,
  shiftData,
}: CloseShiftModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<'count' | 'confirm' | 'done'>('count');
  const [actualCash, setActualCash] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [varianceTrend, setVarianceTrend] = useState<VarianceTrendData | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  // Fetch Paisa Darpan intelligence on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoadingIntel(true);
    Promise.all([
      supabase.rpc('get_shift_cash_flow', { p_cafe_id: cafeId, p_shift_id: shiftData.shift_id }),
      supabase.rpc('get_variance_trend', { p_cafe_id: cafeId, p_days: 30 }),
    ]).then(([flowRes, trendRes]) => {
      if (flowRes.data && !flowRes.data.error) setCashFlow(flowRes.data as CashFlowData);
      if (trendRes.data) setVarianceTrend(trendRes.data as VarianceTrendData);
    }).catch(console.error).finally(() => setLoadingIntel(false));
  }, [isOpen, cafeId, shiftData.shift_id]);

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  const expectedCash = shiftData.current_cash_cents;
  const actualCashCents = Math.round(parseFloat(actualCash || '0') * 100);
  const variance = actualCashCents - expectedCash;

  const handleProceedToConfirm = () => {
    if (!actualCash || parseFloat(actualCash) < 0) {
      toast.error('Please enter the cash count');
      return;
    }
    setStep('confirm');
  };

  const handleCloseShift = async () => {
    setIsClosing(true);
    try {
      const { data, error } = await supabase.rpc('close_cafe_shift', {
        p_shift_id: shiftData.shift_id,
        p_actual_cash_cents: actualCashCents,
        p_variance_reason: variance !== 0 ? varianceReason : null,
      });

      if (error) throw error;

      if (data?.success) {
        setSummary(data.summary as ShiftSummary);
        setStep('done');
        toast.success('Shift closed successfully!');
      } else {
        throw new Error(data?.error || 'Failed to close shift');
      }
    } catch (error) {
      console.error('Close shift error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to close shift');
    } finally {
      setIsClosing(false);
    }
  };

  const handleDone = () => {
    onShiftClosed();
    onClose();
    setStep('count');
    setActualCash('');
    setVarianceReason('');
    setSummary(null);
  };

  if (!isOpen) return null;

  const shiftDuration = () => {
    const start = new Date(shiftData.opened_at);
    const now = new Date();
    const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((now.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'count' && 'Close Day — Hisab'}
            {step === 'confirm' && 'Confirm Close'}
            {step === 'done' && 'Shift Closed'}
          </h2>
          {step !== 'done' && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step 1: Count Cash */}
        {step === 'count' && (
          <div className="p-6 space-y-6">
            {/* Paisa Darpan — Cash Flow Waterfall */}
            {loadingIntel ? (
              <div className="bg-stone-50 rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading cash flow...
              </div>
            ) : cashFlow ? (
              <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-gray-700 mb-3">💰 Paisa Darpan — Cash Flow</h3>
                {cashFlow.waterfall.map((item, i) => {
                  const isPositive = item.amount_cents >= 0;
                  const maxAmount = Math.max(...cashFlow.waterfall.map(w => Math.abs(w.amount_cents)), 1);
                  const barWidth = Math.max(Math.round((Math.abs(item.amount_cents) / maxAmount) * 100), 4);
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-24 text-gray-600 text-xs shrink-0">{item.label_np}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full rounded-lg transition-all ${
                            item.type === 'total' ? 'bg-stone-700' :
                            item.type === 'start' ? 'bg-gray-400' :
                            item.type === 'info' ? 'bg-purple-400' :
                            isPositive ? 'bg-green-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`w-20 text-right font-mono text-xs font-bold ${
                        item.type === 'total' ? 'text-stone-700' :
                        item.type === 'info' ? 'text-purple-600' :
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive && item.type !== 'start' && item.type !== 'total' ? '+' : ''}
                        {formatPrice(item.amount_cents)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shift Duration</span>
                  <span className="font-medium">{shiftDuration()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="font-medium">{shiftData.order_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Opening Float</span>
                  <span className="font-medium">{formatPrice(shiftData.opening_float_cents)}</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between">
                  <span className="text-gray-700 font-medium">Expected Cash</span>
                  <span className="text-lg font-bold text-stone-700">{formatPrice(expectedCash)}</span>
                </div>
              </div>
            )}

            {/* Cash Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Count your cash drawer
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rs</span>
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-stone-500 focus:ring-0"
                  autoFocus
                />
              </div>
            </div>

            {/* Variance Preview */}
            {actualCash && (
              <div className={`p-4 rounded-xl ${
                variance === 0 
                  ? 'bg-green-50 border border-green-200' 
                  : variance > 0 
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {variance === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className={`w-5 h-5 ${variance > 0 ? 'text-blue-600' : 'text-red-600'}`} />
                  )}
                  <span className={`font-medium ${
                    variance === 0 ? 'text-green-700' : variance > 0 ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    {variance === 0 
                      ? 'Perfect match!' 
                      : variance > 0 
                        ? `Surplus: ${formatPrice(variance)}`
                        : `Short: ${formatPrice(Math.abs(variance))}`
                    }
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToConfirm}
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && (
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> Expected Cash
                </span>
                <span className="font-medium">{formatPrice(expectedCash)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600 flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Actual Count
                </span>
                <span className="font-medium">{formatPrice(actualCashCents)}</span>
              </div>
              <div className={`flex justify-between py-3 rounded-lg px-3 ${
                variance === 0 ? 'bg-green-50' : variance > 0 ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                <span className="font-medium">Difference</span>
                <span className={`font-bold ${
                  variance === 0 ? 'text-green-600' : variance > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {variance >= 0 ? '+' : ''}{formatPrice(variance)}
                </span>
              </div>
            </div>

            {/* Variance Reason (if different) */}
            {variance !== 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for difference <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  placeholder="e.g., Gave change of Rs 50 by mistake"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:border-stone-500 focus:ring-0 resize-none"
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('count')}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCloseShift}
                disabled={isClosing}
                className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClosing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Closing...
                  </>
                ) : (
                  'Confirm Close'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && summary && (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Shift Closed Successfully</h3>
              <p className="text-gray-500 text-sm">Your shift has been recorded</p>
            </div>

            {/* Final Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sales</span>
                <span className="font-medium">{formatPrice(summary.total_sales_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Banknote className="w-3 h-3" /> Cash
                </span>
                <span>{formatPrice(summary.cash_sales_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> Digital
                </span>
                <span>{formatPrice(summary.digital_sales_cents)}</span>
              </div>
              {summary.variance_cents !== 0 && (
                <div className={`flex justify-between pt-2 border-t ${
                  summary.variance_cents > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  <span>Variance</span>
                  <span className="font-medium">
                    {summary.variance_cents >= 0 ? '+' : ''}{formatPrice(summary.variance_cents)}
                  </span>
                </div>
              )}
            </div>

            {/* Variance Trend — Paisa Darpan Intelligence */}
            {varianceTrend && varianceTrend.shift_count >= 2 && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  {varianceTrend.is_improving
                    ? <TrendingUp className="w-4 h-4 text-green-500" />
                    : <TrendingDown className="w-4 h-4 text-red-500" />
                  }
                  30-Day Variance Trend
                </h4>
                <div className="flex items-center gap-3">
                  <MiniSparkline data={varianceTrend.shifts} />
                  <div className="text-xs text-gray-500">
                    <p>Avg: <span className={`font-bold ${varianceTrend.avg_variance_cents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {varianceTrend.avg_variance_cents >= 0 ? '+' : ''}{formatPrice(varianceTrend.avg_variance_cents)}
                    </span></p>
                    <p>{varianceTrend.shift_count} shifts • {varianceTrend.is_improving ? 'Improving ↑' : 'Needs attention'}</p>
                  </div>
                </div>
              </div>
            )}
            {varianceTrend && varianceTrend.shift_count < 2 && (
              <p className="text-xs text-center text-gray-400">Close 2+ shifts to see your variance trend</p>
            )}

            <button
              onClick={handleDone}
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
