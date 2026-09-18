# ADR-0001 — Console backend & write path

**Status:** Proposed
**Date:** 2026-09-18

## Context

The OpenFlows architecture mandates (system-architecture.md §3.4–3.5) that the web UI is a thin client over the same control-plane state and commands the CLI uses, and that **the UI never talks to Redis directly** — the Controller and harness remain the only Redis writers. It also mandates **CLI↔UI parity**: every web action maps 1:1 to a CLI command.

However, the HTTP API / `openflows-dashboard` binary / `openflows control` command the docs describe **do not exist in code**. The Console is greenfield and must render live fleet state and perform operator actions today.

## Decision

- The Console runs a **server-side data layer** (Next.js Server Components + Server Actions / route handlers) as the single trusted backend. The browser never touches Redis.
- **Read path:** the data layer reads durable, tenant-namespaced Redis keys directly (via a typed reader mirroring `ns:{tenant}:` prefixing) to render dashboards, Kanban, health, and tenant lists. Reading is not writing, so this does not violate the "only writers are Controller/harness" rule, and requires **no Rust changes**.
- **Write path:** mutations go through the same primitives the CLI uses. Until a Controller HTTP API exists, the data layer invokes the `openflows` CLI as a subprocess (e.g. `openflows gate approve …`, `openflows tenant add …`), preserving CLI↔UI parity.
- **Doctor:** re-implemented as typed server-side checks with the identical probes as `binary/src/doctor.rs`.
- **Coder ops:** through a Coder API client mirroring `crates/coder-client`.

## Consequences

- The foundation ships today with zero Rust changes and full parity with the CLI.
- Writing via CLI subprocess is less elegant than an HTTP API; a later ADR should move writes to a Controller HTTP endpoint when it exists (the data layer is the seam).
- The data layer is a trusted control-plane writer by policy; it must be authenticated and never exposed client-side.

## Future note

When `openflows control`/`set-registry` and a Controller HTTP API land upstream, the write path can be re-pointed without changing the UI (this ADR is then superseded).
