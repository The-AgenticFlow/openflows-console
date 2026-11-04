# Run the whole stack locally

This guide takes you from nothing to a Console that signs you in, provisions a
tenant, and watches an agent turn a GitHub issue into a pull request. It covers
the Console, OpenFlows Manager, Coder, and the GitHub App that connects them.
Everything runs on one machine with Docker.

The Manager's own, more detailed operator steps live in the OpenFlows repo
(`docs/implementation/centralized-deployment/operator-local-runbook.md`). This
guide follows the same path and adds what the Console and Coder need.

## What you are building

```
Browser ──► Console :3000 ──► Manager :3002 ──► Postgres :5544  (control plane)
                 │                 │  ├──────► Redis    :6380  (tenant runtime)
                 │                 │  └──────► Coder    :7080  (operator token)
                 └─ /api/v1, /auth proxied      │
                                                ▼
                         Coder ──► workspaces (Nexus, Forge, Sentinel, Vessel, Lore)
                                   run in Docker; they call Manager back
                                   Coder hooks reach each Nexus through the relay :7081
```

- The **Console** talks only to the Manager `/api/v1` (ADR-0006). It never
  reaches Coder, Redis or GitHub directly.
- The **Manager** owns sessions, roles, secrets and the tenant lifecycle. It
  drives Coder with an operator token and receives Coder's chat hooks.
- **Coder** runs each agent in a Docker workspace and hosts the AI chats.
- The **GitHub App** signs users in, gives the Manager repository access, and
  signs agents in to Git.

## 1. Prerequisites

| Need | Notes |
| --- | --- |
| Docker with Compose | Workspaces and Coder run in containers |
| Node.js 24 and pnpm | Console |
| Rust (stable) and `cargo` | Manager and the workspace binaries |
| Terraform is **not** needed | Coder's provisioner bundles it |
| A GitHub account that can create a GitHub App | One App per environment |
| A Coder **Premium** licence | Multi-organisation and external provisioners need it. Request a trial from Coder; a free licence is not enough |
| An AI provider key | An OpenAI-compatible or OpenRouter key with credit, for the agents' chats |

## 2. Create the GitHub App

In GitHub → Settings → Developer settings → GitHub Apps → New GitHub App:

- **Callback URLs**, one per line:
  - `http://localhost:3000/auth/github/callback` (Console sign-in)
  - `http://localhost:3000/api/v1/github/oauth/callback` (connecting GitHub to an organisation)
  - `http://localhost:7080/api/v2/users/oauth2/github/callback` (Coder sign-in)
- **Setup URL**: `http://localhost:3000/api/v1/github/setup`.
- **Webhook**: leave inactive for local use, or point it at the Manager.
- **Permissions** (least privilege; the full rationale is in
  `docs/implementation/centralized-deployment/02-github-app.md` in the OpenFlows
  repo): repository Contents, Issues and Pull requests **write**; Checks,
  Commit statuses and Actions **read**; **Workflows write** (only Forge's Git
  credential uses it, to add CI); organisation Members **read**. Do not grant
  repository Administration.
- **Account permission: Email addresses (read).** Without it Coder sign-in
  fails with a 403 on `/user/emails`.
- Generate a **client secret** and a **private key** (PEM) and note the **App
  ID**, **client ID** and the App's **slug**.
- Install the App on your account or organisation and grant it the
  repositories you want agents to work on.

Treat the client secret and private key like passwords: never commit them.

## 3. Choose how to start the infrastructure

The OpenFlows repo ships everything the Manager needs in one place:
`deployment.compose.yml` (Coder, its database, Redis and the runtime relay on
`:7081`) and `.env.openflows.example`. **Use them if you can**, and follow
`operator-local-runbook.md` for steps 3 to 6. Their `setup` command also
registers the OAuth application the Manager uses to link a user's Coder
account (callback `<OPENFLOWS_PUBLIC_URL>/auth/coder/callback`) and records its
client id.

Steps 3 to 6 below describe the same result assembled by hand, as used for the
reference development machine. Use them to understand each piece, or when you
already have a Coder you want to reuse. Local Postgres and Redis:

```sh
docker run -d --name openflows-dev-pg -p 127.0.0.1:5544:5432 \
  -e POSTGRES_USER=openflows -e POSTGRES_PASSWORD=<choose-one> \
  -e POSTGRES_DB=openflows_control_plane postgres:16-alpine
docker run -d --name openflows-dev-redis -p 127.0.0.1:6380:6379 redis:7-alpine
```

Workspaces must also reach Redis by the name `redis` on Coder's Docker network.
After step 4 creates that network, connect it:

```sh
docker network connect --alias redis openflows-dev-coder_default openflows-dev-redis
```

Workspaces reach Coder's hook relay on `:7081`; it is part of
`deployment.compose.yml`. If you assemble the stack by hand you must also run
that relay (see the runbook), or chat hooks will not reach the tenants.

## 4. Start Coder

Create a folder for the dev stack (for example `~/.openflows-dev/coder`) with
this `docker-compose.yml` (development only):

```yaml
name: openflows-dev-coder
services:
  coder-db:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: coder, POSTGRES_PASSWORD: coder, POSTGRES_DB: coder }
    volumes: [coder_db_data:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U coder"], interval: 5s, retries: 10 }
  coder:
    image: ghcr.io/coder/coder:v2.37.3
    user: "0:0"
    ports: ["127.0.0.1:7080:7080"]
    env_file: [.env]
    environment:
      CODER_PG_CONNECTION_URL: postgres://coder:coder@coder-db:5432/coder?sslmode=disable
      CODER_ACCESS_URL: http://localhost:7080
      CODER_HTTP_ADDRESS: 0.0.0.0:7080
      CODER_PROVISIONER_DAEMONS: "1"
      CODER_PROVISIONER_DAEMON_TYPE: docker
      DOCKER_HOST: unix:///var/run/docker.sock
      CODER_MAX_TOKEN_LIFETIME: 2160h
    extra_hosts: ["host.docker.internal:host-gateway"]
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
    depends_on: { coder-db: { condition: service_healthy } }
volumes:
  coder_db_data:
```

and a `.env` beside it (mode 0600, never committed):

```sh
# Coder sign-in and Git access through the GitHub App from step 2
CODER_OAUTH2_GITHUB_CLIENT_ID=<app client id>
CODER_OAUTH2_GITHUB_CLIENT_SECRET=<app client secret>
CODER_OAUTH2_GITHUB_ALLOW_SIGNUPS=true
CODER_OAUTH2_GITHUB_ALLOW_EVERYONE=true
CODER_EXTERNAL_AUTH_0_ID=primary-github
CODER_EXTERNAL_AUTH_0_TYPE=github
CODER_EXTERNAL_AUTH_0_SCOPES=repo
CODER_EXTERNAL_AUTH_0_CLIENT_ID=<app client id>
CODER_EXTERNAL_AUTH_0_CLIENT_SECRET=<app client secret>

# Chat hook: Coder tells the Manager when agent chats change
CODER_CHAT_HOOK_ENABLED=true
CODER_CHAT_HOOK_URL=http://host.docker.internal:3002/api/v1/hooks/coder/chat
CODER_CHAT_HOOK_SECRET=<64 hex characters, shared with the Manager>
# Local HTTP only. Remove this and use https:// outside a laptop.
CODER_CHAT_HOOK_ALLOW_INSECURE=true
CODER_EXPERIMENTS=agent-lifecycle-hooks,oauth2
```

Generate the hook secret as printable text (the Manager and Coder must read the
same value, and a binary value is mangled by environment variables):

```sh
openssl rand -hex 32
```

Then:

1. `docker compose up -d` and open `http://localhost:7080`.
2. Create the first (admin) user. Keep the password in a password manager: when
   you copy it from a terminal, do not include a trailing `%` that some shells
   print.
3. Add your Premium licence: **Deployment → Licenses**.
4. Create an **operator token** for the Manager: **Account → Tokens**, a
   long-lived token owned by an administrator. Coder tokens last at most 7 days
   unless the lifetime above allows more; note its expiry and renew it (see
   [Operating notes](#9-operating-notes)). Save it to a file with mode 0600,
   for example `~/.openflows-dev/secrets/coder-operator-token`.

## 5. Configure the Manager

Copy the Manager's example environment from the OpenFlows repo and fill it in.
The values that matter locally:

```sh
OPENFLOWS_MODE=local
OPENFLOWS_PUBLIC_URL=http://localhost:3000        # the Console's address
OPENFLOWS_MANAGER_ADDR=172.17.0.1:3002            # reachable from containers (see Linux below)
OPENFLOWS_DATABASE_URL=postgres://openflows:<password>@127.0.0.1:5544/openflows_control_plane
OPENFLOWS_AUTH_ALLOW_LOOPBACK=true
OPENFLOWS_AUTH_COOKIE_SECURE=false                # HTTP on localhost only

OPENFLOWS_GITHUB_CLIENT_ID=<app client id>
OPENFLOWS_GITHUB_APP_ID=<app id>
OPENFLOWS_GITHUB_APP_SLUG=<app slug>
OPENFLOWS_GITHUB_CLIENT_SECRET_REF=github-client-secret
OPENFLOWS_GITHUB_PRIVATE_KEY_REF=github-app-private-key
OPENFLOWS_GITHUB_WEBHOOK_SECRET_REF=github-webhook-secret
OPENFLOWS_CRYPTO_MASTER_KEY_REF=crypto-master-key
# Secrets are files under OPENFLOWS_SECRET_DIR (mode 0700), referenced by name
OPENFLOWS_SECRET_PROVIDER=filesystem
OPENFLOWS_SECRET_DIR=$HOME/.openflows-dev/secrets
OPENFLOWS_SECRET_FILE_MODE=0644                   # Linux only, see below

CODER_URL=http://localhost:7080
OPENFLOWS_CODER_OPERATOR_TOKEN_REF=coder-operator-token
OPENFLOWS_CODER_HOOK_SECRET_REF=coder-hook-secret

OPENFLOWS_REDIS_ADMIN_URL=redis://127.0.0.1:6380
OPENFLOWS_RUNTIME_REDIS_URL=redis://redis:6379    # as seen from workspaces
OPENFLOWS_RUNTIME_RELAY_BASE_URL=http://127.0.0.1:7081/tenants/{tenant}

OPENFLOWS_PROVISIONER_BACKEND=docker
OPENFLOWS_PROVISIONER_NETWORK=openflows-dev-coder_default
OPENFLOWS_PROVISIONER_CODER_URL=http://coder:7080
OPENFLOWS_RUNTIME_MANAGER_URL=http://172.17.0.1:3002   # how workspaces reach the Manager
OPENFLOWS_HOOK_URL=http://host.docker.internal:3002/api/v1/hooks/coder/chat
OPENFLOWS_RELEASE_NAME=<release name>             # see "release names" below
OPENFLOWS_CODER_OAUTH_CLIENT_ID=<set by `setup`>
OPENFLOWS_CODER_OAUTH_CLIENT_SECRET_REF=coder-oauth-client-secret
```

Put each secret in its own file under `OPENFLOWS_SECRET_DIR`, named as the
`*_REF` settings say: the GitHub client secret, the App private key (PEM), the
webhook secret, the crypto master key, the Coder operator token, the Coder
OAuth client secret and the hook secret (the same 64 characters as in Coder's
`.env`). Keep the files private to your user (mode 0600, or the mode set above).

### Linux hosts

Two things differ from macOS Docker Desktop:

- **Reaching the Manager from containers.** `host.docker.internal` only exists
  on Linux if it is mapped. The workspace templates in the OpenFlows repo add
  `host.docker.internal:host-gateway`; bind the Manager to the Docker bridge
  address (`172.17.0.1:3002`) so containers can reach it, and use that address
  for `OPENFLOWS_RUNTIME_MANAGER_URL`.
- **Readable credentials.** The Manager writes each runtime credential as mode
  0600 owned by you, and the workspace runs as uid 1000. Set
  `OPENFLOWS_SECRET_FILE_MODE=0644` and make sure `OPENFLOWS_SECRET_DIR` is mode
  0700 (`chmod 700`); the Manager refuses a wider file mode otherwise. Without
  this the agent harness fails with "Permission denied" on
  `/run/openflows/runtime.json` and agents stall at planning.

### Release names are immutable

The Manager publishes the workspace templates under `OPENFLOWS_RELEASE_NAME`
and refuses to start if the templates in your working tree differ from what it
stored for that name ("configured template release differs from immutable").
After changing any template, choose a new release name.

## 6. Build the workspace binaries and start the Manager

From the OpenFlows repo:

```sh
make dev-sync          # builds the Linux controller and harness into .dev-binaries
export TF_VAR_dev_binary_host_path="$PWD/.dev-binaries"
export TF_VAR_docker_network=openflows-dev-coder_default
cargo run -p openflows-manager -- --config <your env file> setup
cargo run -p openflows-manager -- --config <your env file> doctor
cargo run -p openflows-manager -- --config <your env file> serve
```

`setup` prepares the control plane, `doctor` checks every connection (fix any
failure before continuing), and `serve` applies migrations and listens. Leave it
running. Check it with `curl http://172.17.0.1:3002/api/v1/` (or your address).

## 7. Run the Console

```sh
cd openflows-console
cp .env.example .env.local        # set OPENFLOWS_MANAGER_URL to the Manager's address
pnpm install
pnpm dev                          # http://localhost:3000
```

`OPENFLOWS_MANAGER_URL` is the only required setting. The optional footer links
are described in `CONTRIBUTING.md`.

## 8. First run: connect everything

1. **Sign in.** Open `http://localhost:3000` and choose *Continue with GitHub*.
2. **Create an organisation.** The Console shows setup progress while the
   Manager prepares the Coder organisation, a Docker provisioner and the
   templates. It becomes *ready* when finished.
3. **Link your Coder account.** In the Console, *Account → Coder*, sign in to
   Coder with GitHub when asked. Agent chats are owned by this Coder user.
4. **Give Coder an AI model for the new organisation.** In Coder, open
   *Agents → Settings → Models*, switch to the new organisation, add your
   provider (base URL and API key) and a model, and mark it **Default**. Without
   a model, agent chats fail at once. Set the model's *max output tokens* to a
   value the provider accepts and its *context limit* to the model's real size;
   a value that is too large is rejected by the provider with HTTP 413.
5. **Connect GitHub.** *GitHub → Connect*, install the App on the repository
   account, and pick the repositories.
6. **Create a tenant.** *Tenants → New tenant* and choose a repository. The
   Manager provisions Redis keys, a hook key and the Nexus workspace. When the
   tenant is *Running* and the runtime *Responding*, Nexus is polling GitHub.
7. **Give it work.** Open an issue in the repository. Nexus turns it into a
   ticket, starts a Forge agent, and the tenant page's *Agent activity* card
   shows each agent's ticket and status. Forge plans, Sentinel reviews the plan,
   Forge builds and opens a pull request, Sentinel and Vessel review it, and you
   approve and merge.

If an agent fails, the card explains why in plain language (for example the AI
provider's credit or usage limit) and the notification bell raises an alert.
Fix the cause in Coder, then **stop and start** the tenant for a fresh agent
session.

## 9. Operating notes

- **Coder operator token expiry.** The Manager calls Coder with it. When it
  expires, tenant actions and agent activity fail. Create a new token, replace
  the secret file, and restart the Manager.
- **Chats are private to their owner.** Another Coder user, even an
  administrator, cannot see or message an agent chat.
- **Deleting an organisation** is queued by the Manager. Until a worker for it
  ships, an organisation stays in *Deleting*, and the Console says so.
- **Rotate anything you have pasted** into chats, tickets or terminals: the
  GitHub client secret, the Coder admin password and any tokens.

## 10. Run the tests

```sh
pnpm lint
pnpm typecheck
pnpm test          # unit tests (no services needed)
pnpm test:e2e      # browser tests against a fake Manager (needs Google Chrome)
```

The end-to-end tests do not need the stack above: they run the real Console
against a small fake Manager (`e2e/support/fake-manager.mjs`) and build into
`.next-e2e`, so a running `pnpm dev` is not disturbed. They use the system
Chrome (`channel: "chrome"`); no browser download is needed.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Coder sign-in returns 403 on `/user/emails` | Add *Email addresses (read)* to the GitHub App and accept the new permission |
| Coder rejects the admin password | Copy it without a trailing `%`; check for browser autofill |
| "configured template release differs from immutable" | Templates changed; set a new `OPENFLOWS_RELEASE_NAME` |
| Provisioner `PROVISIONER_NOT_READY`, or "Could not resolve host.docker.internal" | Set the provisioner network and `CODER_URL`; on Linux bind the Manager to `172.17.0.1` and use that address for the runtime URL |
| Coder refuses the chat hook (HTTP) | Local only: set `CODER_CHAT_HOOK_ALLOW_INSECURE=true`; use HTTPS elsewhere |
| Chat hook returns 401 | Hook secret differs between Coder and the Manager, or it is binary; use 64 hex characters in both |
| Agent fails with `AI_USAGE_LIMIT` | The provider refused for credit or usage; add credit or change the model |
| Agent fails with `AI_AUTH_FAILED` | The provider key in Coder is wrong, expired or has stray whitespace |
| Agent error HTTP 413 from the provider | Lower the model's max output tokens and set its real context limit in Coder |
| Agent stuck at planning, harness "Permission denied" on `runtime.json` | Linux file ownership; set `OPENFLOWS_SECRET_FILE_MODE=0644` and recreate the workspace |
| Invitation link loses its token after sign-in | Use the current Console: `/invitations` is public so the link survives sign-in |
| Tenant stays *Provisioning* | Open the tenant's latest operation for the failing step; delete and recreate the tenant if it cannot recover |
