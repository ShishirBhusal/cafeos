/**
 * ABC Inventory Analysis (Pareto classification)
 * ==============================================
 *
 * PROBLEM
 *   A cafe stocks dozens of ingredients but its cash and attention are limited.
 *   Which items deserve tight control, and which can be managed loosely?
 *
 * THE PRINCIPLE (Pareto / 80-20)
 *   In almost every inventory, a small share of items accounts for most of the
 *   money tied up in stock. ABC analysis makes that concrete:
 *     - Class A: the vital few  — ~top 70–80% of consumption *value*.
 *                Count them often, keep safety stock lean, negotiate hard.
 *     - Class B: the middle     — the next ~15%.
 *     - Class C: the trivial many — the last ~5–10% of value, often most of the
 *                item *count*. Cheap to over-stock; manage with simple rules.
 *
 * THE ALGORITHM
 *   1. For each item compute annual consumption value:
 *        value = annualUsageQty × unitCost
 *      (Here "usage" comes from replaying real orders through recipes; unit cost
 *       comes from the ingredient's purchase price ÷ pack size.)
 *   2. Sort items by value, descending.
 *   3. Walk the sorted list accumulating a running % of total value.
 *   4. Assign a class by where the cumulative % crosses the A/B thresholds.
 *
 * Deterministic, O(n log n) for the sort, and every number on screen can be
 * re-derived by hand — which is exactly what makes it defensible in a viva.
 *
 * Pure module: no I/O.
 */

export interface AbcInput {
  id: string;
  name: string;
  /** Units consumed over the analysis window (e.g. last 28 days, or annualised). */
  usageQuantity: number;
  /** Cost of one tracking unit, in paisa (¹⁄₁₀₀ rupee). */
  unitCostPaisa: number;
  /** Optional unit label for display (e.g. "g", "L"). */
  unit?: string;
}

export type AbcClass = 'A' | 'B' | 'C';

export interface AbcResultItem extends AbcInput {
  /** usageQuantity × unitCostPaisa, in paisa. */
  consumptionValuePaisa: number;
  /** This item's share of total consumption value, 0–100. */
  valuePercent: number;
  /** Running total of valuePercent down the sorted list, 0–100. */
  cumulativePercent: number;
  abcClass: AbcClass;
}

export interface AbcThresholds {
  /** Cumulative-value cut-off for class A (default 0.80 = 80%). */
  a: number;
  /** Cumulative-value cut-off for class B (default 0.95 = 95%). */
  b: number;
}

export interface AbcSummary {
  className: AbcClass;
  itemCount: number;
  /** Share of the item *count* this class represents, 0–100. */
  itemPercent: number;
  /** Share of total consumption *value* this class holds, 0–100. */
  valuePercent: number;
  valuePaisa: number;
}

export interface AbcAnalysis {
  items: AbcResultItem[];
  summary: AbcSummary[];
  totalValuePaisa: number;
}

const DEFAULT_THRESHOLDS: AbcThresholds = { a: 0.8, b: 0.95 };

/**
 * Classify inventory items into A/B/C by consumption value.
 *
 * @param inputs      Items with usage and unit cost.
 * @param thresholds  Cumulative-value cut-offs (defaults 80% / 95%).
 */
export function abcAnalysis(
  inputs: AbcInput[],
  thresholds: AbcThresholds = DEFAULT_THRESHOLDS
): AbcAnalysis {
  // Step 1: consumption value per item.
  const withValue = inputs.map((it) => ({
    ...it,
    consumptionValuePaisa: Math.max(0, it.usageQuantity) * Math.max(0, it.unitCostPaisa),
  }));

  const totalValuePaisa = withValue.reduce((s, it) => s + it.consumptionValuePaisa, 0);

  // Degenerate case: no consumption value anywhere. Everything is class C.
  if (totalValuePaisa <= 0) {
    const items: AbcResultItem[] = withValue.map((it) => ({
      ...it,
      valuePercent: 0,
      cumulativePercent: 0,
      abcClass: 'C' as const,
    }));
    return { items, summary: summarise(items, totalValuePaisa), totalValuePaisa };
  }

  // Step 2: sort by value, descending.
  withValue.sort((a, b) => b.consumptionValuePaisa - a.consumptionValuePaisa);

  // Steps 3–4: cumulative walk + class assignment.
  let cumulative = 0;
  const items: AbcResultItem[] = withValue.map((it) => {
    const valuePercent = (it.consumptionValuePaisa / totalValuePaisa) * 100;
    cumulative += it.consumptionValuePaisa;
    const cumulativePercent = (cumulative / totalValuePaisa) * 100;

    // The threshold test uses the cumulative % *including* this item, so the
    // single item that pushes past 80% is still counted as class A.
    let abcClass: AbcClass;
    if (cumulativePercent <= thresholds.a * 100) abcClass = 'A';
    else if (cumulativePercent <= thresholds.b * 100) abcClass = 'B';
    else abcClass = 'C';

    return {
      ...it,
      valuePercent: Math.round(valuePercent * 10) / 10,
      cumulativePercent: Math.round(cumulativePercent * 10) / 10,
      abcClass,
    };
  });

  // Guarantee at least one A when there is any value (the top item is always A),
  // covering the edge case where the first item alone already exceeds threshold A.
  if (items.length > 0 && !items.some((i) => i.abcClass === 'A')) {
    items[0].abcClass = 'A';
  }

  return { items, summary: summarise(items, totalValuePaisa), totalValuePaisa };
}

function summarise(items: AbcResultItem[], totalValuePaisa: number): AbcSummary[] {
  const classes: AbcClass[] = ['A', 'B', 'C'];
  const n = items.length || 1;
  return classes.map((className) => {
    const group = items.filter((i) => i.abcClass === className);
    const valuePaisa = group.reduce((s, i) => s + i.consumptionValuePaisa, 0);
    return {
      className,
      itemCount: group.length,
      itemPercent: Math.round((group.length / n) * 1000) / 10,
      valuePercent:
        totalValuePaisa > 0
          ? Math.round((valuePaisa / totalValuePaisa) * 1000) / 10
          : 0,
      valuePaisa,
    };
  });
}
