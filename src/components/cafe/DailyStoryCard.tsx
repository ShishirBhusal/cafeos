'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  Users,
  Banknote,
  Smartphone,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Share2,
  BookOpen,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { formatRs } from '@/lib/formatRs';

interface DailyStory {
  date: string;
  day_name: string;
  day_name_np: string;
  total_orders: number;
  total_revenue_cents: number;
  total_expenses_cents: number;
  fixed_cost_daily_cents: number;
  net_profit_cents: number;
  cash_sales_cents: number;
  digital_sales_cents: number;
  avg_order_cents: number;
  paid_count: number;
  unpaid_count: number;
  unpaid_cents: number;
  top_item: { name: string; quantity: number; revenue_cents: number } | null;
  busiest_hour: { hour: number; orders: number } | null;
  slowest_hour: { hour: number; orders: number } | null;
  new_customers: number;
  cash_variance_cents: number | null;
  comparison: {
    vs_last_week_orders: number;
    vs_last_week_revenue: number;
    vs_30day_avg_orders: number;
    vs_30day_avg_revenue: number;
  };
  insights: string[];
}

interface DailyStoryCardProps {
  story: DailyStory;
  cafeName: string;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
  compact?: boolean;
}


function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getComparisonBadge(current: number, previous: number): { text: string; isUp: boolean } | null {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, isUp: pct > 0 };
}

export default function DailyStoryCard({ story, cafeName, onPrevDay, onNextDay, isToday = true, compact = false }: DailyStoryCardProps) {
  const orderComparison = getComparisonBadge(story.total_orders, story.comparison.vs_last_week_orders);
  const profitIsPositive = story.net_profit_cents >= 0;

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-stone-50 to-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-stone-600" />
            <h3 className="font-bold text-gray-900">Aaja Ko Katha</h3>
          </div>
          <span className="text-xs text-gray-500">{story.day_name_np}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{story.total_orders}</p>
            <p className="text-xs text-gray-500">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatRs(story.total_revenue_cents)}</p>
            <p className="text-xs text-gray-500">Revenue</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${profitIsPositive ? 'text-stone-700' : 'text-red-600'}`}>
              {formatRs(story.net_profit_cents)}
            </p>
            <p className="text-xs text-gray-500">Profit</p>
          </div>
        </div>

        {story.unpaid_count > 0 && (
          <p className="text-sm text-stone-700">
            <AlertTriangle className="w-3.5 h-3.5 inline text-stone-400" /> {story.unpaid_count} unpaid ({formatRs(story.unpaid_cents || 0)})
          </p>
        )}
        {story.top_item && (
          <p className="text-sm text-gray-600">
            <Star className="w-3.5 h-3.5 inline text-stone-400" /> Top: <strong>{story.top_item.name}</strong> ({story.top_item.quantity} sold)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Aaja Ko Katha</h2>
              <p className="text-sm text-stone-300">{cafeName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">{story.day_name_np}</p>
            <p className="text-sm text-stone-300">{new Date(story.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Big Numbers */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-stone-50 rounded-xl p-3 text-center">
            <p className="text-3xl font-bold text-stone-900 tabular-nums">{story.total_orders}</p>
            <p className="text-xs text-stone-500 mt-1">Orders</p>
            {orderComparison && (
              <span className={`text-xs font-medium ${orderComparison.isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
                {orderComparison.isUp ? '↑' : '↓'} {orderComparison.text} vs last {story.day_name}
              </span>
            )}
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatRs(story.total_revenue_cents)}</p>
            <p className="text-xs text-stone-500 mt-1">Revenue</p>
          </div>
          <div className={`${profitIsPositive ? 'bg-stone-50' : 'bg-rose-50'} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold tabular-nums ${profitIsPositive ? 'text-stone-700' : 'text-rose-600'}`}>
              {formatRs(story.net_profit_cents)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Net Profit</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Top Item */}
          {story.top_item && (
            <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
              <Award className="w-8 h-8 text-stone-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-stone-900">{story.top_item.name}</p>
                <p className="text-xs text-stone-500">{story.top_item.quantity} sold • {formatRs(story.top_item.revenue_cents)}</p>
              </div>
            </div>
          )}

          {/* Busiest Hour */}
          {story.busiest_hour && (
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
              <Clock className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-stone-900">Peak: {formatHour(story.busiest_hour.hour)}</p>
                <p className="text-xs text-stone-500">{story.busiest_hour.orders} orders</p>
              </div>
            </div>
          )}

          {/* Cash/Digital Split */}
          <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
            <Banknote className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-stone-900">Cash: {formatRs(story.cash_sales_cents)}</p>
              <p className="text-xs text-stone-500">
                {story.total_revenue_cents > 0 
                  ? Math.round(story.cash_sales_cents / story.total_revenue_cents * 100) + '% of sales'
                  : 'No sales'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
            <Smartphone className="w-8 h-8 text-purple-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-stone-900">Digital: {formatRs(story.digital_sales_cents)}</p>
              <p className="text-xs text-stone-500">eSewa/Khalti/Fonepay</p>
            </div>
          </div>

          {/* New Customers */}
          {story.new_customers > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
              <Users className="w-8 h-8 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-stone-900">{story.new_customers} New</p>
                <p className="text-xs text-stone-500">Customers today</p>
              </div>
            </div>
          )}

          {/* Cash Variance */}
          {story.cash_variance_cents !== null && (
            <div className={`flex items-center gap-3 rounded-xl p-3 ${
              story.cash_variance_cents >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {story.cash_variance_cents >= 0 
                ? <TrendingUp className="w-8 h-8 text-emerald-600 shrink-0" />
                : <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
              }
              <div>
                <p className={`text-sm font-bold ${story.cash_variance_cents >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Cash: {story.cash_variance_cents >= 0 ? '+' : ''}{formatRs(story.cash_variance_cents)}
                </p>
                <p className="text-xs text-stone-500">
                  {story.cash_variance_cents >= 0 ? 'Ramro! 👏' : 'Check garnus'}
                </p>
              </div>
            </div>
          )}

          {/* Unpaid Orders */}
          {story.unpaid_count > 0 && (
            <div className="flex items-center gap-3 bg-yellow-50 rounded-xl p-3">
              <ShoppingBag className="w-8 h-8 text-yellow-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-yellow-700">{story.unpaid_count} Unpaid</p>
                <p className="text-xs text-gray-500">Collect payment!</p>
              </div>
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-stone-50 rounded-xl p-4">
          <h4 className="font-semibold text-stone-700 text-sm mb-2">Profit Breakdown</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-600">Revenue</span>
              <span className="font-medium text-emerald-700 tabular-nums">+{formatRs(story.total_revenue_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Daily Expenses</span>
              <span className="font-medium text-rose-600 tabular-nums">-{formatRs(story.total_expenses_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Fixed Cost Share</span>
              <span className="font-medium text-rose-600 tabular-nums">-{formatRs(story.fixed_cost_daily_cents)}</span>
            </div>
            <hr className="border-stone-300 my-1" />
            <div className="flex justify-between font-bold">
              <span className="text-stone-900">नाफा (Net Profit)</span>
              <span className={`tabular-nums ${profitIsPositive ? 'text-stone-700' : 'text-rose-600'}`}>
                {formatRs(story.net_profit_cents)}
              </span>
            </div>
          </div>
        </div>

        {/* Insights */}
        {story.insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-700 text-sm">Katha ka Kura</h4>
            {story.insights.map((insight, i) => (
              <p key={i} className="text-sm text-stone-700 bg-stone-50 rounded-xl px-4 py-3 border border-stone-200">
                {insight}
              </p>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onPrevDay}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Day
          </button>

          {!isToday && onNextDay && (
            <button
              onClick={onNextDay}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              Next Day <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
