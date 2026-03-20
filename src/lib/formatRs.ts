/**
 * CafeOS Currency Formatter — Single Source of Truth
 * 
 * Nepal-specific: Rs 1,200 format using Indian number grouping (en-IN)
 * Internal storage: paisa (cents). 100 paisa = Rs 1.
 * 
 * DECISION: Unpaid orders ≠ Revenue. Only paid orders count as revenue.
 * Cash in hand = Revenue. Everything else is "pending collection."
 */

export function formatRs(cents: number): string {
  const isNeg = cents < 0;
  const abs = Math.abs(cents);
  const rs = Math.round(abs / 100);
  return `${isNeg ? '-' : ''}Rs ${rs.toLocaleString('en-IN')}`;
}

/**
 * Format with paisa (decimal) for precise amounts like ingredient costs
 */
export function formatRsDecimal(cents: number): string {
  const isNeg = cents < 0;
  const abs = Math.abs(cents);
  const rs = abs / 100;
  return `${isNeg ? '-' : ''}Rs ${rs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculate days in current month (handles Feb, leap years, etc.)
 */
export function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Calculate daily fixed cost share from monthly/yearly amounts
 * Uses actual days in month, NOT hardcoded 30.
 */
export function calculateDailyFixedCost(
  costs: { amount_cents: number; frequency: string }[],
  date: Date = new Date()
): number {
  const daysInMonth = getDaysInMonth(date);
  return costs.reduce((sum, c) => {
    if (c.frequency === 'daily') return sum + c.amount_cents;
    if (c.frequency === 'monthly') return sum + Math.round(c.amount_cents / daysInMonth);
    if (c.frequency === 'weekly') return sum + Math.round(c.amount_cents / 7);
    if (c.frequency === 'yearly') return sum + Math.round(c.amount_cents / 365);
    return sum + Math.round(c.amount_cents / daysInMonth);
  }, 0);
}
