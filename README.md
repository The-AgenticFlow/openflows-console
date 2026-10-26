# OpenFlows Console

Production control panel for [OpenFlows](https://github.com/The-AgenticFlow/openflows) — monitor AI agents running on Coder, manage multi-tenant workspaces, track tasks on a Kanban board, and watch system health at a glance.

OpenFlows is an autonomous AI software team that turns GitHub issues into reviewed, production-ready pull requests on self-hosted [Coder](https://coder.com) workspaces. This console is the operator's visual control surface — the foundation layer that all further work on operating and supervising OpenFlows builds on.

## Features

- **GitHub sign-in and organisations** — sign in with GitHub, create organisations, switch between them; every view is scoped to the organisation and role of the signed-in user.
- **GitHub App connection** — guided install, accessible repositories, missing-permission and revoked-access recovery, reconcile.
- **Tenant lifecycle** — create a tenant from an authorised repository, watch stage-by-stage provisioning, and start / stop / clean / retry / delete with state-aware controls and explicit confirmation for destructive actions.
- **Members** — invitation links, role changes, removal and ownership transfer.
- **Operations** — stable, shareable operation and tenant URLs with progress, safe failure detail and recovery guidance.

The Console talks only to OpenFlows Manager's `/api/v1` (see [ADR-0006](./docs/adr/0006-manager-api-only-bff.md)); it never touches Redis, Coder or privileged GitHub APIs. It requires a running Manager (see CONTRIBUTING.md).

## Getting Started

### Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io)
- An OpenFlows deployment (see [openflows](https://github.com/The-AgenticFlow/openflows)) to point the console at

### Install

```bash
pnpm install
```

### Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses hot reload so edits are reflected immediately.

### Build for production

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```

## Technology

Built with [Next.js](https://nextjs.org) (App Router), [React](https://react.dev), [TypeScript](https://www.typescriptlang.org), and [Tailwind CSS](https://tailwindcss.com) — always on the latest stable versions — plus the [TanStack](https://tanstack.com) suite (Query, Table, Virtual) for data, tables, and lists.

## Project structure

```
src/
├── app/                  # Next.js App Router routes & layout
├── components/           # React components
└── lib/
    ├── domain/types.ts   # Typed domain models mirroring the OpenFlows Redis schema
    ├── providers.tsx     # TanStack Query client + devtools
    └── api/              # Data sources (swap for the real reader in T2)
docs/
├── architecture/         # System architecture
└── adr/                  # Architecture Decision Records
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, and quality gates. See CONTRIBUTING.md to run it against a local Manager.

## Roadmap

- [x] Console foundation, sign-in, organisations, onboarding (Phase 1)
- [x] GitHub App connection and recovery (Phase 2)
- [x] Tenant lifecycle and operation timeline (Phase 3)
- [x] Members, invitations, roles, ownership transfer, audit history, platform operator views (Phase 4)
- [ ] Browser end-to-end tests and CI wiring

## Related

- [OpenFlows](https://github.com/The-AgenticFlow/openflows) — the autonomous AI dev team this console operates
- [Control panel UI issue #216](https://github.com/The-AgenticFlow/openflows/issues/216) — the foundational work this repository tracks

## License

[MIT](./LICENSE)
