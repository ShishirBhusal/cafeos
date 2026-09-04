import { knnForecast, dowDistance, knnForecastHorizon, type DailySale } from '../knn-forecast';

describe('dowDistance (circular day-of-week distance)', () => {
  it('is zero for the same day', () => {
    expect(dowDistance(3, 3)).toBe(0);
  });

  it('wraps around the week so Sat(6) and Sun(0) are 1 apart', () => {
    expect(dowDistance(6, 0)).toBe(1);
  });

  it('is symmetric', () => {
    expect(dowDistance(1, 5)).toBe(dowDistance(5, 1));
  });
});

describe('knnForecast', () => {
  // Four Saturdays selling ~20, other days ~5. 2026-02-07 is a Saturday.
  const history: DailySale[] = [
    { date: '2026-01-31', units: 20 }, // Sat
    { date: '2026-02-07', units: 22 }, // Sat
    { date: '2026-02-14', units: 18 }, // Sat
    { date: '2026-02-03', units: 5 }, // Tue
    { date: '2026-02-04', units: 6 }, // Wed
    { date: '2026-02-05', units: 4 }, // Thu
  ];

  it('forecasts a Saturday close to past Saturdays, not the weekday average', () => {
    // 2026-02-21 is a Saturday.
    const r = knnForecast(history, '2026-02-21', 3);
    expect(r.predictedUnits).toBeGreaterThan(15);
    expect(r.predictedUnits).toBeLessThan(25);
  });

  it('uses Saturday neighbours for a Saturday target', () => {
    const r = knnForecast(history, '2026-02-21', 3);
    const dows = r.neighbours.map((n) => n.dayOfWeek);
    expect(dows.every((d) => d === 6)).toBe(true);
  });

  it('reports high confidence when neighbours agree', () => {
    const tight: DailySale[] = [
      { date: '2026-01-31', units: 20 },
      { date: '2026-02-07', units: 20 },
      { date: '2026-02-14', units: 20 },
    ];
    const r = knnForecast(tight, '2026-02-21', 3);
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('reports low confidence when neighbours disagree wildly', () => {
    const noisy: DailySale[] = [
      { date: '2026-01-31', units: 2 },
      { date: '2026-02-07', units: 40 },
      { date: '2026-02-14', units: 5 },
    ];
    const r = knnForecast(noisy, '2026-02-21', 3);
    expect(r.confidence).toBeLessThan(0.6);
  });

  it('clamps k to the amount of history available', () => {
    const r = knnForecast(history.slice(0, 2), '2026-02-21', 5);
    expect(r.k).toBe(2);
    expect(r.neighbours).toHaveLength(2);
  });

  it('returns a safe zero result for empty history', () => {
    const r = knnForecast([], '2026-02-21', 5);
    expect(r).toEqual({ predictedUnits: 0, confidence: 0, neighbours: [], k: 0 });
  });
});

describe('knnForecastHorizon', () => {
  const history: DailySale[] = [
    { date: '2026-02-01', units: 10 },
    { date: '2026-02-02', units: 12 },
    { date: '2026-02-03', units: 8 },
  ];

  it('produces one forecast per future day, starting the day after the latest', () => {
    const out = knnForecastHorizon(history, 3, 3);
    expect(out).toHaveLength(3);
    expect(out[0].date).toBe('2026-02-04');
    expect(out[2].date).toBe('2026-02-06');
  });
});
