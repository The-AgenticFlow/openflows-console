// Cursor paging helper for Manager list endpoints. Manager returns a bounded
// page (`items`) and an opaque `next_cursor` (null on the last page); a list
// the Console needs in full (pending invitations, a connection's repositories)
// is read by following the cursor. The loop is bounded by `maxPages` so a
// misbehaving server that keeps returning a cursor cannot loop forever.
//
// This takes the page fetcher as a parameter, not the API client, so it has no
// dependency on `api.ts` and can be tested on its own.

export interface CursorPage<T> {
  items: T[];
  next_cursor?: string | null;
}

/**
 * Collect every item of a paged list. `fetchPage` receives the query string to
 * append ("" or "?limit=..&after=..") and returns one page.
 */
export async function allPages<T>(
  fetchPage: (query: string) => Promise<CursorPage<T>>,
  { limit, maxPages = 20 }: { limit?: number; maxPages?: number } = {},
): Promise<{ items: T[] }> {
  const items: T[] = [];
  let after: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (after) params.set("after", after);
    const query = params.toString();
    const r: CursorPage<T> = await fetchPage(query ? `?${query}` : "");
    items.push(...r.items);
    if (!r.next_cursor) break;
    after = r.next_cursor;
  }
  return { items };
}
