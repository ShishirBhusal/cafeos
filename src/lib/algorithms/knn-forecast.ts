/**
 * K-Nearest-Neighbours Demand Forecast
 * =====================================
 *
 * PROBLEM
 *   Given a menu item's past daily sales, predict how many units it will sell on
 *   a future date, so the cafe can prep and reorder ingredients ahead of demand.
 *
 * WHY KNN
 *   Cafe demand is strongly driven by the *day of the week* — Saturdays look like
 *   other Saturdays, not like Tuesdays. KNN captures this without training: to
 *   forecast a target day we simply look up the `k` most similar past days and
 *   average what actually sold on them. It is:
 *     - Non-parametric  (no model to fit, no weights to store)
 *     - Explainable     (we can point at the exact neighbour days used)
 *     - Robust on small data (works with a few weeks of history)
 *
 * THE ALGORITHM (regression variant)
 *   1. Turn history into points. Each past day = one point with:
 *        feature  = day-of-week, encoded on a circle so Sun(0) and Sat(6) are
 *                   neighbours, not 6 apart (see `dowDistance`).
 *        label    = units sold that day.
 *   2. Measure distance from the target day to every past day.
 *   3. Keep the k smallest distances (the "nearest neighbours").
 *   4. Predict = distance-weighted average of the neighbours' labels.
 *      Closer days count more (weight = 1 / (distance + ε)).
 *   5. Confidence = how tightly the neighbours agree (low spread ⇒ high
 *      confidence). This is a plain, defensible heuristic, not a probability.
 *
 * COMPLEXITY
 *   O(n) distance computations per forecast, n = days of history. Tiny here.
 *
 * This module is pure (no I/O). It is unit-tested and can be read top-to-bottom.
 */

/** One historical observation: a calendar day and the units sold that day. */
export interface DailySale {
  /** ISO date string, e.g. "2026-02-14". */
  date: string;
  /** Units sold on that date (already aggregated across all orders). */
  units: number;
}

export interface ForecastNeighbour {
  date: string;
  units: number;
  dayOfWeek: number;
  distance: number;
  weight: number;
}

export interface ForecastResult {
  /** Predicted units for the target date (rounded to 1 decimal). */
  predictedUnits: number;
  /** 0–1 agreement score among neighbours; higher = more reliable. */
  confidence: number;
  /** The neighbour days the prediction was built from (for "show your work"). */
  neighbours: ForecastNeighbour[];
  /** k actually used (may be < requested k when history is short). */
  k: number;
}

const DAYS_IN_WEEK = 7;

/**
 * Circular distance between two days of the week (0=Sun … 6=Sat).
 * Encoding the week as a circle means Saturday(6) and Sunday(0) are 1 apart,
 * not 6 — which matches how weekend demand actually behaves.
 * Returns a value in [0, 3.5].
 */
export function dowDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, DAYS_IN_WEEK - raw);
}

/** JS Date.getUTCDay() for an ISO date, guarded against bad input. */
function dayOfWeek(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? 0 : d.getUTCDay();
}

/**
 * Forecast units for `targetDate` from `history` using KNN regression.
 *
 * @param history    Past daily sales (any order). Needs ≥1 point.
 * @param targetDate ISO date to predict.
 * @param k          Neighbours to use (default 5, clamped to history length).
 */
export function knnForecast(
  history: DailySale[],
  targetDate: string,
  k = 5
): ForecastResult {
  if (history.length === 0) {
    return { predictedUnits: 0, confidence: 0, neighbours: [], k: 0 };
  }

  const targetDow = dayOfWeek(targetDate);

  // Steps 1–2: build points and measure distance from the target day.
  const scored = history.map((h) => {
    const dow = dayOfWeek(h.date);
    return {
      date: h.date,
      units: h.units,
      dayOfWeek: dow,
      distance: dowDistance(targetDow, dow),
    };
  });

  // Step 3: keep the k nearest. Ties broken by most recent date so the forecast
  // leans on fresher behaviour when several days are equally similar.
  scored.sort((a, b) =>
    a.distance !== b.distance ? a.distance - b.distance : b.date.localeCompare(a.date)
  );
  const effectiveK = Math.min(k, scored.length);
  const nearest = scored.slice(0, effectiveK);

  // Step 4: distance-weighted average. ε keeps exact matches (distance 0) finite.
  const EPS = 0.5;
  let weightedSum = 0;
  let weightTotal = 0;
  const neighbours: ForecastNeighbour[] = nearest.map((n) => {
    const weight = 1 / (n.distance + EPS);
    weightedSum += weight * n.units;
    weightTotal += weight;
    return { ...n, weight };
  });
  const predictedUnits = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // Step 5: confidence from neighbour agreement. We use the coefficient of
  // variation (spread relative to the mean) and map it to [0,1]: tight cluster
  // ⇒ ~1, wildly scattered ⇒ ~0.
  const mean =
    nearest.reduce((s, n) => s + n.units, 0) / (nearest.length || 1);
  const variance =
    nearest.reduce((s, n) => s + (n.units - mean) ** 2, 0) /
    (nearest.length || 1);
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : stdDev > 0 ? 1 : 0;
  const confidence = Math.max(0, Math.min(1, 1 - cv));

  return {
    predictedUnits: Math.round(predictedUnits * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    neighbours,
    k: effectiveK,
  };
}

/**
 * Convenience: forecast the next `horizonDays` calendar days after the most
 * recent date in `history`. Returns one result per future date.
 */
export function knnForecastHorizon(
  history: DailySale[],
  horizonDays: number,
  k = 5
): { date: string; forecast: ForecastResult }[] {
  if (history.length === 0) return [];
  const latest = history
    .map((h) => h.date)
    .sort()
    .at(-1)!;
  const out: { date: string; forecast: ForecastResult }[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const d = new Date(latest + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, forecast: knnForecast(history, iso, k) });
  }
  return out;
}
