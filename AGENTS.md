<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Read the file before you touch it

Before writing a single line of code in a file, read the whole file — starting with the
**header comment** that explains what that file is and why it exists (e.g. `types.ts` declares its
ADR-0005 defensive contract; `fleet.ts` declares its mock-vs-real data source seam).

- Preserve and update the header comment when your edit changes the file's contract or purpose.
- Honor the **inline comments**: they encode intent, invariants, and trade-offs the code alone does
  not carry. Do not delete or rewrite them to silence a check; if one is now wrong, correct it
  deliberately and say so.
- Never "clean up" or strip comments as a side effect of an edit.

For a **new file**, write the header comment first, before any code: state what the file is for, how
it fits the module, and any non-obvious contract or trade-off. Then keep that header accurate as the
file grows.

## Environment variables

- Declare every server environment variable in `src/lib/config/env.ts`.
- Read environment variables through `getEnv()`; do not use `process.env`
  elsewhere in application code.
- Document new operator-facing variables in `.env.example` and
  `CONTRIBUTING.md`.
