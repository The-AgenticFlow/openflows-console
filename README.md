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

## Docker

Pre-built production images are published to GitHub Container Registry. Until the first `v*` release is tagged, `develop` is the tag to use (`latest` and the version tags do not exist yet):

```bash
docker pull ghcr.io/the-agenticflow/openflows-console:develop
```

### Recommended: let the OpenFlows repository start it

From a checkout of the [openflows](https://github.com/The-AgenticFlow/openflows) repository, with a Manager already running:

```bash
./scripts/console.sh
```

It finds the Manager, starts this image on <http://localhost:3000> and checks that sign-in reaches the Manager. To start the whole control plane in Docker together with the Console, use `./scripts/up.sh` from that repository (see its operator runbook). Both handle the Docker networking below for you.

### Manually

The Console needs one runtime variable, `OPENFLOWS_MANAGER_URL`, read when the container starts:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  --add-host host.docker.internal:host-gateway \
  -e OPENFLOWS_MANAGER_URL=http://host.docker.internal:3002 \
  ghcr.io/the-agenticflow/openflows-console:develop
```

Then open [http://localhost:3000](http://localhost:3000). A container can reach a Manager on the host only if the Manager listens on an address the container can route to and no firewall drops the traffic. On Linux, a Manager bound to `127.0.0.1`, or a host firewall (for example `ufw`) that blocks the Docker bridge, makes sign-in hang on "Redirecting to GitHub…" while `docker logs` shows `ETIMEDOUT` or `ECONNREFUSED`. If that happens, use `./scripts/console.sh` (it runs the container on the host network on Linux), or see [docs/local-development.md](./docs/local-development.md).

Available tags: `edge` (main), `develop`, `sha-<short>` for every build, and, once a `v*` release is tagged, `latest`, `vX.Y.Z` and `vX.Y`. To build the image yourself:

```bash
docker build -t openflows-console .
docker run --rm -p 127.0.0.1:3000:3000 --add-host host.docker.internal:host-gateway \
  -e OPENFLOWS_MANAGER_URL=http://host.docker.internal:3002 openflows-console
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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, and quality gates. To run the Console locally against a working OpenFlows stack, follow [docs/local-development.md](./docs/local-development.md).

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
