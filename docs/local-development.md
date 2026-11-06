# Run the Console locally

This guide gets the Console running against a working OpenFlows stack and walks
through the first run: sign in, create an organisation, create a tenant and
watch an agent work a ticket.

## Before you start: the OpenFlows stack must be running

The Console does not run on its own. It talks only to OpenFlows Manager, and
Manager needs Coder, Postgres, Redis and a GitHub App. Setting those up is
covered once, in the OpenFlows repository:

> `docs/implementation/centralized-deployment/operator-local-runbook.md`

Follow that runbook until these are true, then come back here:

- [ ] Manager is running and answers `curl http://<manager-address>/api/v1/`
      (it listens on `127.0.0.1:3002` by default, or the address you set in
      `OPENFLOWS_MANAGER_ADDR`).
- [ ] Coder is running at `http://localhost:7080`, has a Premium licence and an
      administrator, and the Manager's `doctor` command reports no failures.
- [ ] You have the GitHub App from the runbook (App ID, client ID, secret).

## 1. Point Manager and GitHub at the Console

People sign in through the Console, so Manager and the GitHub App must both know
the Console's address. This is the one place the runbook's defaults do not fit a
local Console: its example uses an HTTPS host, but locally the Console is plain
HTTP on `localhost:3000`.

**a. Manager settings** (in the env file you gave Manager, for example
`.env.openflows`):

```sh
OPENFLOWS_PUBLIC_URL=http://localhost:3000   # the Console's origin: no trailing path
OPENFLOWS_AUTH_ALLOW_LOOPBACK=true           # lets Manager accept HTTP on localhost
OPENFLOWS_AUTH_COOKIE_SECURE=false           # session cookies over HTTP; local only
```

Manager refuses to start with an `http://` public URL unless the loopback
setting is `true`. Use real HTTPS values outside a local machine. Restart
Manager after changing them. If you ran Manager's `setup` earlier with a
different public URL, run it again: it registers the redirect address
(`<OPENFLOWS_PUBLIC_URL>/auth/coder/callback`) for linking Coder accounts.

**b. The GitHub App.** In GitHub, open the App's settings and add these under
**Callback URLs** (keep any that are already there):

```
http://localhost:3000/auth/github/callback
http://localhost:3000/api/v1/github/oauth/callback
```

and set the **Setup URL** to:

```
http://localhost:3000/api/v1/github/setup
```

The Console passes `/api/v1` and `/auth` straight through to Manager, so these
are the same paths the runbook lists, on the Console's address.

## 2. Start the Console

You need Node.js 24 and [pnpm](https://pnpm.io).

```sh
cd openflows-console
cp .env.example .env.local
pnpm install
pnpm dev                       # http://localhost:3000
```

The Console has one required setting, in `.env.local`:

```sh
OPENFLOWS_MANAGER_URL=http://127.0.0.1:3002
```

Set it to the address Manager listens on (`OPENFLOWS_MANAGER_ADDR` in Manager's
env file), as reachable from the machine running the Console. If Manager is
bound to another address, for example `172.17.0.1:3002` on Linux so containers
can reach it, use that address here. Nothing else is required: the optional
footer links are in `CONTRIBUTING.md`. The Console reads this setting when it
starts, so restart `pnpm dev` after changing it. Do not put secrets in it; the
Console never holds a GitHub or Coder credential.

## 3. First run

1. **Sign in.** Open `http://localhost:3000` and choose *Continue with GitHub*.
2. **Create an organisation.** The Console shows setup progress while Manager
   prepares the Coder organisation, a Docker provisioner and the templates. It
   is ready when the status turns *ready*.
3. **Link your Coder account.** Open *Account* and sign in to Coder with GitHub
   when asked. Agent chats belong to this Coder user.
4. **Give Coder an AI model for the new organisation.** This is the one step
   done in Coder, not the Console. Open Coder (`http://localhost:7080`) →
   *Agents* → *Settings* → *Models*, switch to the new organisation, add your
   provider (base URL and API key) and a model, and mark it **Default**. Without
   a model, agents fail at once. Set the model's *max output tokens* to a value
   the provider accepts and its *context limit* to the model's real size.
5. **Connect GitHub.** Open *GitHub* → *Connect*, install the App on the account
   that owns your repository, and pick the repositories.
6. **Create a tenant.** Open *Tenants* → *New tenant* and choose a repository.
   When the tenant is *Running* and its runtime *Responding*, the Nexus agent is
   watching the repository.
7. **Give it work.** Open an issue in that repository. Nexus turns it into a
   ticket and starts a Forge agent. The tenant page's *Agent activity* card shows
   each agent's ticket and status. Forge plans, Sentinel reviews, Forge builds
   and opens a pull request, and you approve and merge it.

If an agent fails, the card says why in plain language (for example the AI
provider's credit limit) and the notification bell raises an alert. Fix the
cause in Coder, then *Stop* and *Start* the tenant for a fresh agent session.

## 4. Run the tests

```sh
pnpm lint
pnpm typecheck
pnpm test          # unit tests; no services needed
pnpm test:e2e      # browser tests; needs Google Chrome installed
```

The browser tests do not need the OpenFlows stack. They run the real Console
against a small fake Manager (`e2e/support/fake-manager.mjs`) and build into
`.next-e2e`, so a running `pnpm dev` is not disturbed.

## Troubleshooting

Most problems come from the OpenFlows stack rather than the Console; the
runbook covers those (Linux networking, secret file permissions, template
release names, Coder tokens). The ones you meet from the Console:

| Symptom | Cause and fix |
| --- | --- |
| Manager refuses to start with "public origin requires HTTPS" | Set `OPENFLOWS_AUTH_ALLOW_LOOPBACK=true` (step 1a) |
| Sign-in loops, or GitHub says the callback is not allowed | Add the callback URLs from step 1b to the GitHub App, and check `OPENFLOWS_PUBLIC_URL` is exactly `http://localhost:3000` |
| Signing in works but you land back on the sign-in page (some browsers) | The browser refused a `Secure` session cookie on plain HTTP: set `OPENFLOWS_AUTH_COOKIE_SECURE=false` and restart Manager |
| "Link your Coder account" fails | `setup` was run with another public URL; run it again so the Coder redirect address matches |
| Every page shows an error right after sign-in | `OPENFLOWS_MANAGER_URL` is wrong, or Manager is not running |
| Agent activity shows `AI_USAGE_LIMIT` | The AI provider refused for credit or usage; add credit or change the model in Coder |
| Agent activity shows `AI_AUTH_FAILED` | The provider key in Coder is wrong, expired or has stray whitespace |
| Agent fails with HTTP 413 from the provider | Lower the model's max output tokens and set its real context limit in Coder |
| Agent stuck at planning, "Permission denied" on `runtime.json` | Linux file ownership; see the runbook's Linux section (`OPENFLOWS_SECRET_FILE_MODE`) |
| Tenant stays *Provisioning* | Open the tenant's latest operation for the failing step; delete and recreate the tenant if it cannot recover |
| Tenant actions and agent activity start failing after a few days | The Coder operator token expired; create a new one, replace the secret file and restart Manager |
| An organisation stays *Deleting* | Manager queues the deletion, but no worker finishes it yet |
