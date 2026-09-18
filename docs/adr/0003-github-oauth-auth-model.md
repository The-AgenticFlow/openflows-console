# ADR-0003 — GitHub OAuth auth model

**Status:** Proposed
**Date:** 2026-09-18

## Context

Issue #216 requires a free-trial onboarding flow where a user installs/authorises OpenFlows against their GitHub repositories, **logs in to the control panel via GitHub**, and manages tenants by adding a `repo/owner` per tenant.

This GitHub sign-in to the Console is **separate** from Coder's GitHub *external auth* (`CODER_EXTERNAL_AUTH_0_*`), which provisions git identity to agent workspaces. The Console needs its own authentication layer.

## Decision

- **GitHub OAuth App** as the Console's authentication provider (session cookie via a standard Next.js auth library, e.g. Auth.js).
- On sign-in, the Console stores the user's GitHub identity and (where the user authorises it) the repo access needed to validate `repo/owner` additions.
- Each tenant in OpenFlows remains a distinct Coder user; adding a tenant still drives the upstream `tenant add` path (Coder user + nexus workspace + GitHub OAuth link + `repository` key).
- A **free-trial flag** gates the onboarding surface (trial status → prompt to configure/authorise).

## Consequences

- Two distinct GitHub OAuth concepts (Console auth vs Coder external auth) must be clearly labelled in the UI and docs to avoid operator confusion.
- The Console must hold OAuth secrets server-side; scopes must be minimal.
- Programmatic verification of the tenant's GitHub OAuth grant is an upstream gap (today it is a manual Enter-key wait in `ensure_tenant`) — flagged as a later milestone.
