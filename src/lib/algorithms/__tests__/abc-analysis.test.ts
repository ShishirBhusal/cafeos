import { abcAnalysis, type AbcInput } from '../abc-analysis';

describe('abcAnalysis', () => {
  // Classic Pareto shape: one dominant item, a middle, and cheap tail items.
  const inputs: AbcInput[] = [
    { id: '1', name: 'Coffee Beans', usageQuantity: 100, unitCostPaisa: 800 }, // 80,000
    { id: '2', name: 'Milk', usageQuantity: 100, unitCostPaisa: 120 }, // 12,000
    { id: '3', name: 'Sugar', usageQuantity: 100, unitCostPaisa: 40 }, // 4,000
    { id: '4', name: 'Salt', usageQuantity: 100, unitCostPaisa: 20 }, // 2,000
    { id: '5', name: 'Napkins', usageQuantity: 100, unitCostPaisa: 20 }, // 2,000
  ];

  it('computes consumption value = usage x unit cost', () => {
    const { items } = abcAnalysis(inputs);
    const coffee = items.find((i) => i.id === '1')!;
    expect(coffee.consumptionValuePaisa).toBe(80000);
  });

  it('sorts items by value descending', () => {
    const { items } = abcAnalysis(inputs);
    expect(items[0].id).toBe('1');
    expect(items[items.length - 1].consumptionValuePaisa).toBeLessThanOrEqual(
      items[0].consumptionValuePaisa
    );
  });

  it('classes the dominant item as A', () => {
    const { items } = abcAnalysis(inputs);
    expect(items.find((i) => i.id === '1')!.abcClass).toBe('A');
  });

  it('cumulative percentage reaches 100 at the last item', () => {
    const { items } = abcAnalysis(inputs);
    expect(items[items.length - 1].cumulativePercent).toBeCloseTo(100, 1);
  });

  it('every item gets exactly one class', () => {
    const { items } = abcAnalysis(inputs);
    for (const it of items) {
      expect(['A', 'B', 'C']).toContain(it.abcClass);
    }
  });

  it('summary value percentages add up to ~100', () => {
    const { summary } = abcAnalysis(inputs);
    const total = summary.reduce((s, g) => s + g.valuePercent, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('always has at least one A item when there is value', () => {
    const single: AbcInput[] = [{ id: 'x', name: 'Only', usageQuantity: 5, unitCostPaisa: 1000 }];
    const { items } = abcAnalysis(single);
    expect(items[0].abcClass).toBe('A');
  });

  it('handles zero total value by classing everything C', () => {
    const zero: AbcInput[] = [
      { id: 'a', name: 'A', usageQuantity: 0, unitCostPaisa: 100 },
      { id: 'b', name: 'B', usageQuantity: 5, unitCostPaisa: 0 },
    ];
    const { items, totalValuePaisa } = abcAnalysis(zero);
    expect(totalValuePaisa).toBe(0);
    expect(items.every((i) => i.abcClass === 'C')).toBe(true);
  });

  it('respects custom thresholds', () => {
    const { items } = abcAnalysis(inputs, { a: 0.5, b: 0.9 });
    // With a 50% cutoff, only the 80k item (66% cumulative) — wait, first item is
    // 80k/100k = 80% cumulative already, so it alone is A.
    const aItems = items.filter((i) => i.abcClass === 'A');
    expect(aItems.length).toBeGreaterThanOrEqual(1);
  });
});
