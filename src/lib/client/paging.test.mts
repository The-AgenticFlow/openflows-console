// Paging tests: lists the Console needs in full are read by following
// Manager's cursor, with the right query each time and a hard page bound.
import assert from "node:assert/strict";
import test from "node:test";

import { api, resetCsrfCache } from "./api.ts";
import { allPages, type CursorPage } from "./paging.ts";

test("allPages follows the cursor and sends limit and after", async () => {
  const queries: string[] = [];
  const pages: CursorPage<number>[] = [{ items: [1, 2], next_cursor: "c 1" }, { items: [3], next_cursor: null }];
  const r = await allPages<number>(async (q) => (queries.push(q), pages.shift()!), { limit: 2 });
  assert.deepEqual(r.items, [1, 2, 3]);
  assert.deepEqual(queries, ["?limit=2", "?limit=2&after=c+1"]);
});

test("allPages sends no query when there is no limit and the list fits one page", async () => {
  const queries: string[] = [];
  const r = await allPages<string>(async (q) => (queries.push(q), { items: ["a"] }));
  assert.deepEqual(r.items, ["a"]);
  assert.deepEqual(queries, [""]);
});

test("allPages stops at maxPages even if the server keeps sending a cursor", async () => {
  let calls = 0;
  const r = await allPages<number>(async () => ({ items: [++calls], next_cursor: "more" }), { maxPages: 3 });
  assert.equal(calls, 3);
  assert.deepEqual(r.items, [1, 2, 3]);
});

test("repositories are requested 100 at a time through the connection's path", async () => {
  resetCsrfCache();
  const urls: string[] = [];
  const replies = [{ items: [{ id: 1, full_name: "o/a" }], next_cursor: "n" }, { items: [{ id: 2, full_name: "o/b" }], next_cursor: null }];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify(replies.shift()), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const r = await api.listRepositories("o1", "conn1");
  assert.deepEqual(r.items.map((x) => x.id), [1, 2]);
  assert.deepEqual(urls, [
    "/api/v1/organizations/o1/github/connections/conn1/repositories?limit=100",
    "/api/v1/organizations/o1/github/connections/conn1/repositories?limit=100&after=n",
  ]);
});
