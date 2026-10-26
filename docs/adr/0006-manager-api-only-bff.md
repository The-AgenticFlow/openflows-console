# ADR-0006 — Manager-API-only BFF, session auth, CSRF and idempotency

**Status:** Proposed (revised: the BFF and in-memory mock were replaced by a same-origin proxy to the real Manager)
**Date:** 2026-10-23
**Supersedes:** ADR-0001 (backend & write path) and ADR-0003 (auth model), for the customer-facing Console (epic #60).

## Context

Epic #60 turns the Console into the customer-facing product. The browser must never reach Redis, Coder or privileged GitHub APIs; OpenFlows Manager is the only authority for policy, authorisation, secrets and tenant lifecycle. ADR-0001 let the Console read Redis and shell out to the CLI; that is incompatible with this. Manager currently exposes only `/health` and `/api/v1/`, so the endpoints the Console needs do not exist yet.

## Decision

- **Browser → Console BFF (`/api/console/*`, `/auth/*`) → Manager `/api/v1` only.** No Redis client, CLI subprocess or GitHub/Coder call exists in the Console.
- **One interface, two implementations.** `src/lib/manager/client.ts` (`ManagerClient`) is implemented by an in-memory mock (default, `OPENFLOWS_DATA_SOURCE=mock`) and an HTTP client (`real`, needs `OPENFLOWS_MANAGER_URL`). `contract.ts` is the Console's proposed v1 contract; align it with Manager as endpoints land. The mock enforces membership scoping, roles, single-use install state, idempotent replay and audit logging so UI guards are tested against a backend that says no.
- **Sessions.** Manager issues an opaque session token after GitHub sign-in; the Console keeps it only in an httpOnly cookie. No token, installation credential or secret-bearing field exists in the contract types.
- **Mutations** require the session cookie, a CSRF double-submit token (`of_csrf` cookie echoed in `x-csrf-token`) and an `Idempotency-Key` header, enforced in one wrapper (`lib/server/mutation.ts`). Errors are mapped to a safe envelope (`code`, `message`, `requestId`, `retryable`, `recovery`); raw upstream detail is logged server-side only.
- **Scoping.** Non-members get `not_found`, never `forbidden`, so other organisations' existence is not revealed. UI role-awareness is UX only; Manager enforces.
- **Routing.** `proxy.ts` only issues the CSRF cookie and does an optimistic cookie-presence redirect to `/login`; it is not authorisation.

## Consequences

- Phase 1–2 journeys (sign in, create organisation, install GitHub App, view repositories, reconcile) run end to end today against the mock.
- The contract may need changes when Manager ships its real endpoints; the seam is `contract.ts` + `http.ts`.
- The legacy Redis/CLI/Kanban/fleet code is superseded and is to be removed or rebuilt on the Manager contract.

## Revision (real Manager integration)

Manager now exists on the tenant-runtime-isolation branch and issues its own session cookie and session-bound CSRF token. The Console therefore proxies `/api/v1/*`, `/auth/*` and `/invitations/accept` to Manager through a Next rewrite (`next.config.ts`) instead of running its own BFF routes and mock. The browser calls Manager directly with `X-CSRF-Token` (from `GET /api/v1/auth/csrf`) and an `Idempotency-Key`; Server Components read `/me` and `/organizations` with the user's forwarded cookies. Types follow Manager's real snake_case shapes and roles (`admin`/`developer`/`viewer`). Audit log reads, platform overview, operation/repository/invitation lists are not exposed by Manager yet and are not faked in the UI.
