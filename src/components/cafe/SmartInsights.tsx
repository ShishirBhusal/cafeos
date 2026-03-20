'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb,
  Star,
  Clock,
  Users,
  Flame,
  Target,
  Award,
  Zap
} from 'lucide-react';
import { formatRs } from '@/lib/formatRs';

interface InsightData {
  type: 'success' | 'warning' | 'info' | 'opportunity';
  title: string;
  message: string;
  metric?: string;
  action?: string;
  icon?: React.ReactNode;
}

interface SmartInsightsProps {
  todayRevenue: number;
  yesterdayRevenue: number;
  avgRevenue: number;
  todayOrders: number;
  avgOrders: number;
  unpaidCount: number;
  unpaidAmount: number;
  topItem?: { name: string; quantity: number };
  slowestHour?: number;
  busiestHour?: number;
  newCustomers?: number;
  cashPercentage?: number;
}

function getInsightIcon(type: InsightData['type']) {
  switch (type) {
    case 'success': return <TrendingUp className="w-5 h-5" />;
    case 'warning': return <AlertTriangle className="w-5 h-5" />;
    case 'opportunity': return <Lightbulb className="w-5 h-5" />;
    default: return <Zap className="w-5 h-5" />;
  }
}

function getInsightStyle(type: InsightData['type']) {
  switch (type) {
    case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'opportunity': return 'bg-blue-50 border-blue-200 text-blue-800';
    default: return 'bg-stone-50 border-stone-200 text-stone-800';
  }
}

function getIconStyle(type: InsightData['type']) {
  switch (type) {
    case 'success': return 'bg-emerald-100 text-emerald-600';
    case 'warning': return 'bg-amber-100 text-amber-600';
    case 'opportunity': return 'bg-blue-100 text-blue-600';
    default: return 'bg-stone-100 text-stone-600';
  }
}

export default function SmartInsights({
  todayRevenue,
  yesterdayRevenue,
  avgRevenue,
  todayOrders,
  avgOrders,
  unpaidCount,
  unpaidAmount,
  topItem,
  slowestHour,
  busiestHour,
  newCustomers = 0,
  cashPercentage = 0,
}: SmartInsightsProps) {
  const insights: InsightData[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Revenue comparison insights
  if (todayRevenue > 0) {
    const vsYesterday = yesterdayRevenue > 0 
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : 0;
    const vsAvg = avgRevenue > 0 
      ? Math.round(((todayRevenue - avgRevenue) / avgRevenue) * 100)
      : 0;

    if (vsYesterday > 20) {
      insights.push({
        type: 'success',
        title: 'Great day! 🎉',
        message: `Revenue is ${vsYesterday}% higher than yesterday`,
        metric: formatRs(todayRevenue),
        icon: <Flame className="w-5 h-5" />,
      });
    } else if (vsYesterday < -20 && currentHour > 14) {
      insights.push({
        type: 'warning',
        title: 'Slower day',
        message: `Revenue is ${Math.abs(vsYesterday)}% lower than yesterday`,
        action: 'Consider a flash promotion',
        icon: <TrendingDown className="w-5 h-5" />,
      });
    }

    if (vsAvg > 15) {
      insights.push({
        type: 'success',
        title: 'Above average!',
        message: `Today is ${vsAvg}% above your 30-day average`,
        icon: <Award className="w-5 h-5" />,
      });
    }
  }

  // Unpaid orders warning
  if (unpaidCount > 0) {
    insights.push({
      type: 'warning',
      title: `${unpaidCount} unpaid order${unpaidCount > 1 ? 's' : ''}`,
      message: `${formatRs(unpaidAmount)} pending collection`,
      action: 'Collect before shift ends',
      icon: <AlertTriangle className="w-5 h-5" />,
    });
  }

  // Top item insight
  if (topItem && topItem.quantity > 3) {
    insights.push({
      type: 'info',
      title: `${topItem.name} is hot! 🔥`,
      message: `${topItem.quantity} sold today - your bestseller`,
      icon: <Star className="w-5 h-5" />,
    });
  }

  // Rush hour prediction
  if (busiestHour && currentHour < busiestHour && currentHour >= busiestHour - 2) {
    insights.push({
      type: 'opportunity',
      title: 'Rush hour coming',
      message: `Peak time usually around ${busiestHour > 12 ? busiestHour - 12 : busiestHour}${busiestHour >= 12 ? 'PM' : 'AM'}`,
      action: 'Prepare ingredients now',
      icon: <Clock className="w-5 h-5" />,
    });
  }

  // Slow period opportunity
  if (slowestHour && currentHour === slowestHour) {
    insights.push({
      type: 'opportunity',
      title: 'Slow period',
      message: 'Great time for inventory check or staff training',
      icon: <Target className="w-5 h-5" />,
    });
  }

  // New customers
  if (newCustomers > 0) {
    insights.push({
      type: 'success',
      title: `${newCustomers} new customer${newCustomers > 1 ? 's' : ''}!`,
      message: 'First-time visitors today',
      action: 'Make a great impression',
      icon: <Users className="w-5 h-5" />,
    });
  }

  // Cash percentage insight
  if (cashPercentage > 80 && todayOrders > 5) {
    insights.push({
      type: 'info',
      title: 'Mostly cash today',
      message: `${cashPercentage}% of payments in cash`,
      action: 'Ensure sufficient change',
      icon: <Zap className="w-5 h-5" />,
    });
  }

  // Order volume insight
  if (todayOrders > avgOrders * 1.3 && avgOrders > 0) {
    insights.push({
      type: 'success',
      title: 'High volume day!',
      message: `${todayOrders} orders vs ${Math.round(avgOrders)} average`,
      icon: <TrendingUp className="w-5 h-5" />,
    });
  }

  // No insights fallback
  if (insights.length === 0) {
    if (currentHour < 10) {
      insights.push({
        type: 'info',
        title: 'Good morning! ☀️',
        message: 'Ready for a great day ahead',
        icon: <Zap className="w-5 h-5" />,
      });
    } else if (todayOrders === 0) {
      insights.push({
        type: 'info',
        title: 'Waiting for first order',
        message: 'Your first order of the day is coming!',
        icon: <Clock className="w-5 h-5" />,
      });
    }
  }

  // Limit to top 3 most relevant insights
  const displayInsights = insights.slice(0, 3);

  if (displayInsights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-1">
        💡 Smart Insights
      </h3>
      <div className="space-y-2">
        {displayInsights.map((insight, index) => (
          <div
            key={index}
            className={`rounded-xl border p-3 ${getInsightStyle(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${getIconStyle(insight.type)}`}>
                {insight.icon || getInsightIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  {insight.metric && (
                    <span className="text-sm font-bold">{insight.metric}</span>
                  )}
                </div>
                <p className="text-xs mt-0.5 opacity-80">{insight.message}</p>
                {insight.action && (
                  <p className="text-xs mt-1 font-medium opacity-90">
                    → {insight.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
