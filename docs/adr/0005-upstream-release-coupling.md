# ADR-0005 — Building on upstream releases (moving-target resilience)

**Status:** Accepted
**Date:** 2026-09-18

## Context

Upstream OpenFlows (`The-AgenticFlow/openflows`) is **actively developed and released**. The Console is greenfield against a moving target: Redis key schemas, CLI commands, and Coder API endpoints can change between releases. The study passes confirmed several contracts are already unstable or planned-not-shipped (e.g. `control:*`, `set-registry`, `registry_json` store key).

If the Console couples tightly to upstream internals, an upstream release silently breaks the UI.

## Decision

The Console is built **on OpenFlows releases**, not its working tree, with explicit resilience rules:

1. **Version compatibility matrix.** The data layer declares which OpenFlows release(s) it supports (e.g. `openflows >= v1.2.x`). This is surfaced in `docs/` and at runtime (a version check against the Controller/repo where possible).
2. **Defensive reads (tolerant schema).** Typed Redis readers use serde with `#[serde(default)]` and unknown-field tolerance — never `deny_unknown_fields`. Unknown/new fields must be ignored, not fatal; the UI degrades gracefully (shows what it understands, hides the rest).
3. **CLI-as-contract for writes.** Writes go through the `openflows` CLI (ADR-0001), so the Console stays compatible for as long as the commands exist. A CLI command disappearing is treated as a compatibility break to be surfaced, not silently swallowed.
4. **Thin, owned data layer.** All upstream coupling is isolated behind `lib/` (ADR-0002). Version bumps touch the data layer only, never UI components.
5. **Release-notes-driven updates.** When upstream ships a release, review the changelog against the data layer (keys added/removed, CLI changes, Coder API changes) before adopting.

## Consequences

- Slightly more code to keep typed reads tolerant (defaults + optional fields).
- A small compatibility surface to maintain, but upstream changes cannot break the UI at runtime.
- The write path and read path both degrade gracefully and surface clear "unsupported OpenFlows version" states.
- This makes the foundation durable as upstream evolves.
