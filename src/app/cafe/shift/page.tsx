import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import CafePageLayout from '@/components/cafe/CafePageLayout';
import { getNepaliDateDaysAgo, nepalDateToUTCRange } from '@/lib/nepalTime';
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface Shift {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opened_by: string;
  closed_by: string | null;
  opening_float_cents: number | null;
  expected_cash_cents: number | null;
  actual_cash_cents: number | null;
  variance_cents: number | null;
  variance_reason: string | null;
  status: string;
}

export default async function ShiftHistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  // Fetch cafe info
  const { data: cafe } = await supabase
    .from('vendor_profiles')
    .select('user_id, business_name')
    .eq('user_id', user.id)
    .single();

  if (!cafe) return null;
  
  // Fetch shift history (last 30 days) using Nepal timezone
  const thirtyDaysAgoNepal = getNepaliDateDaysAgo(30);
  const { start: thirtyDaysAgoUTC } = nepalDateToUTCRange(thirtyDaysAgoNepal);
  
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('cafe_id', cafe.user_id)
    .gte('opened_at', thirtyDaysAgoUTC)
    .order('opened_at', { ascending: false });
  
  // Calculate summary stats
  const closedShifts = (shifts || []).filter(s => s.status === 'closed');
  const totalVariance = closedShifts.reduce((sum, s) => sum + (s.variance_cents || 0), 0);
  const perfectShifts = closedShifts.filter(s => s.variance_cents === 0).length;
  const shortShifts = closedShifts.filter(s => (s.variance_cents || 0) < 0).length;
  
  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  // Variance sparkline data (last 30 closed shifts, oldest first)
  const sparklineData = [...closedShifts].reverse().map(s => s.variance_cents || 0);
  const sparklineMax = Math.max(...sparklineData.map(Math.abs), 1);
  const avgVariance = closedShifts.length > 0 
    ? Math.round(totalVariance / closedShifts.length) 
    : 0;

  return (
    <CafePageLayout title="Shift History" description="Track cash and shift performance">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Total Shifts</div>
            <div className="text-2xl font-bold text-stone-900 tabular-nums">{closedShifts.length}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Perfect Matches</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{perfectShifts}</div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Short Shifts</div>
            <div className="text-2xl font-bold text-rose-600 tabular-nums">{shortShifts}</div>
          </div>
          
          <div className={`bg-white rounded-xl p-4 border ${
            totalVariance >= 0 ? 'border-emerald-200' : 'border-rose-200'
          }`}>
            <div className="text-sm text-stone-500 mb-1">Net Variance</div>
            <div className={`text-2xl font-bold tabular-nums ${
              totalVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {totalVariance >= 0 ? '+' : ''}{formatPrice(totalVariance)}
            </div>
          </div>
        </div>

        {/* Variance Trend Chart */}
        {sparklineData.length > 1 && (() => {
          const chartW = 100; // viewBox percentage
          const chartH = 60;
          const padX = 4;
          const padY = 8;
          const plotW = chartW - padX * 2;
          const plotH = chartH - padY * 2;
          const absMax = Math.max(...sparklineData.map(Math.abs), 100); // min 100 cents = Rs 1
          const n = sparklineData.length;
          const stepX = plotW / Math.max(n - 1, 1);
          const zeroY = padY + plotH * (absMax / (absMax * 2));
          
          const points = sparklineData.map((v, i) => {
            const x = padX + i * stepX;
            const y = padY + plotH * ((absMax - v) / (absMax * 2));
            return { x, y, v };
          });
          
          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          
          // Determine if trend is improving (last 5 shifts vs first 5)
          const recent5 = sparklineData.slice(-5);
          const early5 = sparklineData.slice(0, 5);
          const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length;
          const earlyAvg = early5.reduce((a, b) => a + b, 0) / early5.length;
          const isImproving = recentAvg > earlyAvg;
          
          return (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-stone-900">Variance Trend</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isImproving ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isImproving ? '↑ Improving' : '↓ Needs attention'}
                  </span>
                </div>
                <span className={`text-sm font-medium tabular-nums ${avgVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Avg: {avgVariance >= 0 ? '+' : ''}{formatPrice(avgVariance)}/shift
                </span>
              </div>
              
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-24 mt-2" preserveAspectRatio="none">
                {/* Zero line */}
                <line x1={padX} y1={zeroY} x2={chartW - padX} y2={zeroY} 
                  stroke="#d6d3d1" strokeWidth="0.3" strokeDasharray="1,1" />
                <text x={padX - 1} y={zeroY + 1} fontSize="3" fill="#a8a29e" textAnchor="end">0</text>
                
                {/* Area fill under/over zero */}
                {points.length > 1 && (
                  <>
                    <path
                      d={`${pathD} L${points[points.length - 1].x},${zeroY} L${points[0].x},${zeroY} Z`}
                      fill="url(#varianceGradient)"
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient id="varianceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#f5f5f4" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </>
                )}
                
                {/* Trend line */}
                <path d={pathD} fill="none" stroke="#f97316" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Data dots */}
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.2"
                    fill={p.v >= 0 ? '#22c55e' : '#ef4444'}
                    stroke="white" strokeWidth="0.4"
                  >
                    <title>{formatPrice(p.v)}</title>
                  </circle>
                ))}
              </svg>
              
              <div className="flex justify-between mt-1 text-xs text-stone-400">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>
          );
        })()}
        
        {/* Shift List */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
            <h2 className="font-bold text-stone-900">Shift Records</h2>
          </div>
          
          {!shifts || shifts.length === 0 ? (
            <div className="p-10 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="font-medium text-stone-600">No shifts recorded yet</p>
              <p className="text-sm text-stone-400 mt-1 mb-4">
                Shifts track your cash flow. Open a shift when you start your day, close it when you&apos;re done — CafeOS will tell you if the cash matches.
              </p>
              <a
                href="/cafe/counter"
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
              >
                Open Counter to start a shift
              </a>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {shifts.map((shift: Shift) => (
                <div key={shift.id} className="p-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-stone-400" />
                        <span className="font-medium text-stone-900">
                          {formatDate(shift.opened_at)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          shift.status === 'open' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {shift.status === 'open' ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-stone-500 flex items-center gap-4">
                        <span>{formatTime(shift.opened_at)}</span>
                        {shift.closed_at && (
                          <>
                            <span>→</span>
                            <span>{formatTime(shift.closed_at)}</span>
                          </>
                        )}
                      </div>
                      
                      {shift.variance_reason && (
                        <p className="text-sm text-stone-500 mt-2 italic">
                          &ldquo;{shift.variance_reason}&rdquo;
                        </p>
                      )}
                    </div>
                    
                    {shift.status === 'closed' && (
                      <div className="text-right">
                        <div className="text-sm text-stone-500 mb-1">
                          Expected: {formatPrice(shift.expected_cash_cents || 0)}
                        </div>
                        <div className={`flex items-center gap-1 justify-end ${
                          (shift.variance_cents || 0) === 0 
                            ? 'text-emerald-600' 
                            : (shift.variance_cents || 0) > 0 
                              ? 'text-blue-600' 
                              : 'text-rose-600'
                        }`}>
                          {(shift.variance_cents || 0) === 0 ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (shift.variance_cents || 0) > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold tabular-nums">
                            {(shift.variance_cents || 0) >= 0 ? '+' : ''}
                            {formatPrice(shift.variance_cents || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Variance Trend Warning */}
        {shortShifts >= 3 && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-stone-800">Cash Shortage Pattern Detected</h3>
              <p className="text-sm text-stone-700 mt-1">
                {shortShifts} shifts in the last 30 days had cash shortages. 
                Cash handling review garna birsanu bhayena?
              </p>
            </div>
          </div>
        )}
      </div>
    </CafePageLayout>
  );
}
