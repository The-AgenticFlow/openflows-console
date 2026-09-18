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

> **Note:** This is the foundation-stage repository. Setup instructions will be added as the app is scaffolded.

### Prerequisites

- Node.js 20+ and your package manager of choice (npm, pnpm, yarn)
- An OpenFlows deployment (see [openflows](https://github.com/The-AgenticFlow/openflows)) to point the console at

## Technology

Built with [Next.js](https://nextjs.org) and [TypeScript](https://www.typescriptlang.org), per the OpenFlows control-panel design decision.

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
