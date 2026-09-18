# OpenFlows Console

Production control panel for [OpenFlows](https://github.com/The-AgenticFlow/openflows) — monitor AI agents running on Coder, manage multi-tenant workspaces, track tasks on a Kanban board, and watch system health at a glance.

OpenFlows is an autonomous AI software team that turns GitHub issues into reviewed, production-ready pull requests on self-hosted [Coder](https://coder.com) workspaces. This console is the operator's visual control surface — the foundation layer that all further work on operating and supervising OpenFlows builds on.

## Features

- **Agent monitoring** — live agent lifecycle and work progress across Coder workspaces at a glance.
- **Tenant management** — add and delete multi-tenant workspaces together with all of their resources.
- **Task Kanban** — carry tickets through their lifecycle: *implementation → progress → review → done → merge*.
- **System health** — surface what `openflows doctor` reports so operators can see and act on system status without reading terminal output.
- **GitHub-first onboarding** — free-trial signup, authorise OpenFlows against your repositories, log in via GitHub, and add a `repo/owner` per tenant.

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, and quality gates. The app runs standalone in **mock mode** — no OpenFlows deployment or credentials needed to develop.

## Roadmap

- [ ] Wireframe and admin surface proposal
- [ ] Inventory of `doctor` checks mapped to the UI
- [ ] GitHub auth + free-trial onboarding flow
- [ ] Dashboard: agent / Coder monitoring
- [ ] Tenant management
- [ ] Task Kanban board
- [ ] System health view

## Related

- [OpenFlows](https://github.com/The-AgenticFlow/openflows) — the autonomous AI dev team this console operates
- [Control panel UI issue #216](https://github.com/The-AgenticFlow/openflows/issues/216) — the foundational work this repository tracks

## License

[MIT](./LICENSE)
