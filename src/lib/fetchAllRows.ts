import { SupabaseClient } from '@supabase/supabase-js';

/**
 * PostgREST caps a response at 1000 rows. A query written without `.range()`
 * therefore returns a silently truncated result: no error, no warning, just a
 * third of the cafe's month missing from a revenue total.
 *
 * Pass a builder that produces the query afresh for each page; this walks the
 * ranges until a short page comes back.
 *
 *   const orders = await fetchAllRows(() =>
 *     supabase.from('orders').select('total_cents').eq('cafe_id', cafeId)
 *   );
 *
 * The builder MUST apply a deterministic `.order(...)`, otherwise pages can
 * overlap or skip rows.
 */
export async function fetchAllRows<T>(
  buildQuery: () => any,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
  }

  return rows;
}

export type { SupabaseClient };
