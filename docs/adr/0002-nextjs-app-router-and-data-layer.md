# ADR-0002 — Next.js App Router & data layer

**Status:** Accepted
**Date:** 2026-09-18

## Context

The foundation issue (openflows#216) specifies **Next.js + TypeScript** for the control panel, on the latest stable versions. The scaffold (Next.js 16, React 19, Tailwind v4, pnpm) is already committed.

## Decision

- **Next.js App Router** with React Server Components for data-fetching pages, and **Server Actions / Route Handlers** for mutations (per ADR-0001).
- **Latest stable versions everywhere** (pnpm-managed): Next.js, React, TypeScript, Tailwind.
- A dedicated **data layer module** (`lib/`) isolates all OpenFlows integration (Redis reader, CLI bridge, doctor checks, Coder client) from UI components. Components never import transport details.
- Shared **domain types** mirroring the OpenFlows Redis schema (`Ticket`, `WorkerSlot`, `TicketStatus`, phase, `HeartbeatRecord`, `pending_prs`) live in the data layer so UI and backend never drift.

## Consequences

- Server-rendered dashboards with minimal client JS; good performance and simpler auth.
- Mutations via Server Actions keep state server-side and auditable.
- The typed data layer is the seam that later lets the write path move to a Controller HTTP API (ADR-0001).
