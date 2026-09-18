# ADR-0004 — Kanban data reconciliation

**Status:** Accepted
**Date:** 2026-09-18

## Context

OpenFlows persists **two parallel status models** for a ticket, which can disagree:

- `tickets[i].status` — a `TicketStatus` enum (`open | assigned | in_progress | merged | failed | completed | exhausted | awaiting_human`), the durable terminal/escalation state.
- `ticket:{id}:status` — a phase object `{phase, role, ts}` (`planning | building | testing | review_ready | blocked`), the fine-grained workflow phase driven by the harness.

The issue #216 Kanban columns are *implementation → progress → review → done → merge*.

## Decision

- The Kanban **derives its columns from the phase object** (`ticket:{id}:status`), falling back to `Ticket.status` when the phase key is absent.
- `Ticket.status` overrides when it is a terminal/escalation state (`merged`, `failed`, `completed`, `exhausted`, `awaiting_human`), parking the card in a terminal column.
- The reconciliation is implemented **once** in the data layer (a pure function: ticket → column), not in components.

## Consequences

- A single source of truth for column mapping; components stay dumb.
- An unambiguous column set: Planning → Building → Testing → Review → Merged, with terminal/escalation lanes.
- If upstream unifies the two models later, only the pure function changes.
