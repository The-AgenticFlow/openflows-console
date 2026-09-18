# Contributing to OpenFlows Console

Thanks for your interest in contributing! OpenFlows Console is the operator control panel for the [OpenFlows](https://github.com/The-AgenticFlow/openflows) autonomous AI dev team. This guide gets you from clone to a reviewed PR.

## Table of contents

- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Quality gates](#quality-gates)
- [Pull requests](#pull-requests)
- [Issue guidelines](#issue-guidelines)
- [AI usage & governance](#ai-usage--governance)

## Development setup

Prerequisites:

- Node.js 20+ (this repo is developed against Node 24)
- [pnpm](https://pnpm.io)

```bash
pnpm install     # install dependencies
pnpm dev         # start the dev server at http://localhost:3000
```

The app runs standalone in **mock mode** by default (see [Mock/fixture mode](#mockfixture-mode)) — no OpenFlows deployment, Coder, Redis, or GitHub credentials are required to develop against.

## Project structure

```
src/
├── app/                  # Next.js App Router routes & layout
│   ├── layout.tsx        # Root layout (wraps app in TanStack Query provider)
│   └── page.tsx          # Home / dashboard entry
├── components/           # React components (e.g. fleet-overview)
└── lib/
    ├── domain/types.ts   # Typed domain models mirroring the OpenFlows Redis schema
    ├── providers.tsx     # TanStack Query client + devtools
    └── api/              # Data sources (fleet.ts → swap for the real reader, T2)
docs/
├── architecture/         # System architecture
└── adr/                  # Architecture Decision Records
```

Key conventions:

- **App Router** with Server Components + Server Actions; TanStack Query for client-side data & polling.
- **TanStack Table v9** (note: API differs from v8 — see its in-package `skills/getting-started` guide).
- All OpenFlows integration lives in `src/lib/` (ADR-0001 / ADR-0002); components never touch transport internals.
- Defensive data types (ADR-0005): optional fields, tolerant to upstream schema additions.

## Development workflow

1. Pick an issue (look for the `good first issue` label to start small).
2. Create a branch: `git checkout -b feat/<short-description>`.
3. Make focused commits with conventional messages (`feat:`, `fix:`, `docs:`, `chore:`).
4. Run the quality gates (below) before pushing.
5. Open a pull request using the template.

### Mock/fixture mode

By default the app uses a bundled mock data source so you can develop without infrastructure. To switch to the (future) real data source, set:

```bash
OPENFLOWS_DATA_SOURCE=real
```

Copy `.env.example` to `.env.local` and fill in the variables once the real integration lands (T2+).

## Quality gates

Run all of these locally before opening a PR:

```bash
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm build       # production build
```

These run automatically in CI on every push/PR, so a passing local run means a green CI.

## Pull requests

- Use the [pull request template](./.github/pull_request_template.md).
- Keep changes focused on the issue; reference it with `Closes #N`.
- Note the OpenFlows release you verified against (ADR-0005).
- Fill in the AI usage declaration honestly.

## Issue guidelines

- Use the provided **issue templates** (Bug report / Feature request / Dev ticket) — don't open blank issues.
- Label work by area (`dashboard`, `foundation`) and difficulty (`good first issue`).

## AI usage & governance

AI may accelerate work, but humans own intent, verification, and consequences. Treat AI-generated code as untrusted; never submit work you cannot explain.

- Declare AI assistance in the issue/PR **AI usage declaration**.
- Provide a **source of truth** reference (URL or `#N`) and **verification evidence** (commands/logs). No evidence means it is not done.

See the [AI Governance site](https://adorsys-gis.github.io/ai-governance/) for the full doctrine.
