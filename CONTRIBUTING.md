# Contributing to OpenFlows Console

Thanks for your interest in contributing! OpenFlows Console is the operator control panel for the [OpenFlows](https://github.com/The-AgenticFlow/openflows) autonomous AI dev team. This guide gets you from clone to a reviewed PR.

## Table of contents

- [Contributing to OpenFlows Console](#contributing-to-openflows-console)
  - [Table of contents](#table-of-contents)
  - [Development setup](#development-setup)
  - [Project structure](#project-structure)
  - [Development workflow](#development-workflow)
    - [Running against OpenFlows Manager](#running-against-openflows-manager)
  - [Quality gates](#quality-gates)
  - [Pull requests](#pull-requests)
  - [Issue guidelines](#issue-guidelines)
  - [AI usage \& governance](#ai-usage--governance)

## Development setup

Prerequisites:

- Node.js 20+ (this repo is developed against Node 24)
- [pnpm](https://pnpm.io)

```bash
pnpm install     # install dependencies
pnpm dev         # start the dev server at http://localhost:3000
```

The Console needs a running OpenFlows Manager (see [Running against OpenFlows Manager](#running-against-openflows-manager)).

## Project structure

```text
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

### Running against OpenFlows Manager

The Console has no mock backend: it talks to a real OpenFlows Manager
(`crates/openflows-manager` in the OpenFlows repo, `/api/v1`). Run the Manager,
then:

```bash
cp .env.example .env.local   # set OPENFLOWS_MANAGER_URL
pnpm dev
```

- `OPENFLOWS_MANAGER_URL` — Manager's base URL (default `http://127.0.0.1:3002`).
- `OPENFLOWS_DOCS_URL`, `OPENFLOWS_STATUS_URL`, `OPENFLOWS_PRIVACY_URL`,
  `OPENFLOWS_TERMS_URL` — optional sign-in page footer links; each is shown only
  when set (absolute `http(s)` URLs only).
- `OPENFLOWS_SUPPORT_URL` — optional target of the "Need help signing in?" link;
  an `http(s)` URL or a `mailto:` address. Hidden when unset.
- Sign-in uses Manager's GitHub OAuth. Register `http://localhost:3000/auth/github/callback`
  as a callback URL on the GitHub App Manager is configured with.
- Never commit `.env.local` or real credentials.

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
