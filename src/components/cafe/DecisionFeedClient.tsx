'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { 
  AlertTriangle,
  Clock,
  Package,
  Users,
  TrendingDown,
  CheckCircle2,
  ChefHat,
  ArrowRight,
  Lightbulb,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface Decision {
  priority: 'urgent' | 'today' | 'week' | 'insight' | 'positive';
  type: string;
  title: string;
  description: string;
  action_label: string | null;
  action_url: string | null;
  metadata: Record<string, any>;
}

interface DecisionFeedClientProps {
  cafeId: string;
  compact?: boolean;
}

const priorityConfig = {
  urgent: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-900',
    descColor: 'text-rose-700',
    actionBg: 'bg-rose-600 hover:bg-rose-700',
    badge: 'bg-rose-600 text-white',
    badgeText: 'तुरुन्त',
    icon: AlertTriangle,
  },
  today: {
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    iconBg: 'bg-stone-100',
    iconColor: 'text-stone-500',
    titleColor: 'text-stone-900',
    descColor: 'text-stone-700',
    actionBg: 'bg-stone-900 hover:bg-stone-800',
    badge: 'bg-stone-900 text-white',
    badgeText: 'आज',
    icon: Clock,
  },
  week: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    descColor: 'text-blue-700',
    actionBg: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-600 text-white',
    badgeText: 'यो हप्ता',
    icon: Users,
  },
  insight: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900',
    descColor: 'text-purple-700',
    actionBg: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-purple-600 text-white',
    badgeText: 'बुझ्नुहोस्',
    icon: Lightbulb,
  },
  positive: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    descColor: 'text-emerald-700',
    actionBg: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'bg-emerald-600 text-white',
    badgeText: '✓',
    icon: CheckCircle2,
  },
};

const typeIcons: Record<string, any> = {
  payment: Clock,
  kitchen: ChefHat,
  inventory: Package,
  customers: Users,
  revenue: TrendingDown,
  status: CheckCircle2,
};

export default function DecisionFeedClient({ cafeId, compact = false }: DecisionFeedClientProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_decision_feed', { p_cafe_id: cafeId });
      
      if (error) {
        console.error('Decision feed error:', error);
        setDecisions([]);
      } else {
        setDecisions(data || []);
      }
    } catch (err) {
      console.error('Decision feed fetch failed:', err);
      setDecisions([]);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchDecisions();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchDecisions, 60000);
    return () => clearInterval(interval);
  }, [cafeId]);

  if (loading && decisions.length === 0) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-xl border border-stone-200`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-stone-100 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-stone-100 rounded w-32 animate-pulse" />
            <div className="h-3 bg-stone-100 rounded w-48 mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // No decisions = all clear
  if (decisions.length === 0) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-emerald-50 rounded-xl border border-emerald-200`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">सबै ठीक छ!</p>
            <p className="text-sm text-emerald-700">No urgent decisions needed. Business is running smoothly.</p>
          </div>
        </div>
      </div>
    );
  }

  // Compact mode: show only first urgent/today decision
  if (compact) {
    const topDecision = decisions[0];
    const config = priorityConfig[topDecision.priority];
    const Icon = typeIcons[topDecision.type] || config.icon;

    return (
      <div className={`p-4 ${config.bg} rounded-xl border ${config.border}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 ${config.iconBg} rounded-xl flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.badge}`}>
                {config.badgeText}
              </span>
              <p className={`font-semibold ${config.titleColor} truncate`}>{topDecision.title}</p>
            </div>
            <p className={`text-sm ${config.descColor} line-clamp-1`}>{topDecision.description}</p>
          </div>
          {topDecision.action_url && (
            <Link
              href={topDecision.action_url}
              className={`px-3 py-1.5 ${config.actionBg} text-white text-sm font-medium rounded-lg flex items-center gap-1 flex-shrink-0`}
            >
              {topDecision.action_label || 'Go'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {decisions.length > 1 && (
          <p className="text-xs text-stone-500 mt-2 text-right">
            + {decisions.length - 1} more decisions
          </p>
        )}
      </div>
    );
  }

  // Full mode: show all decisions
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-stone-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-stone-500" />
          निर्णय खोज्नुहोस् (Decisions)
        </h3>
        <button
          onClick={fetchDecisions}
          className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {decisions.map((decision, index) => {
        const config = priorityConfig[decision.priority];
        const Icon = typeIcons[decision.type] || config.icon;

        return (
          <div
            key={`${decision.type}-${index}`}
            className={`p-4 ${config.bg} rounded-xl border ${config.border} transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 ${config.iconBg} rounded-xl flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
                    {config.badgeText}
                  </span>
                </div>
                <p className={`font-semibold ${config.titleColor}`}>{decision.title}</p>
                <p className={`text-sm ${config.descColor} mt-0.5`}>{decision.description}</p>
                
                {decision.action_url && (
                  <Link
                    href={decision.action_url}
                    className={`inline-flex items-center gap-1.5 mt-3 px-4 py-2 ${config.actionBg} text-white text-sm font-medium rounded-xl transition-colors`}
                  >
                    {decision.action_label || 'Take Action'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-stone-400 text-center">
        Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
