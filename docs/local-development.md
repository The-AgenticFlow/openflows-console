# Run OpenFlows and the Console locally

This guide takes you from two freshly cloned repositories to a working local
setup: you sign in to the Console, create an organisation, connect GitHub,
create a tenant, and watch an agent turn a GitHub issue into a pull request.
Follow it top to bottom. Every command is meant to be copied as written.

The guide covers two repositories that sit side by side:

| Repository | What it is | Folder used below |
| --- | --- | --- |
| `openflows` | Manager (the API), Coder setup and the workspace templates | `~/openflows` |
| `openflows-console` | This web interface | `~/openflows-console` |

Plan on about 45 minutes the first time. Most of it is waiting for builds and
for the first organisation to publish its templates (about 4 minutes).

## 0. What you need before you start

**Tools** (all on your machine):

- Docker with Docker Compose, and permission to run it without `sudo`
- Rust (stable) with `cargo`, `make`, `git`, `openssl` and `curl`
- Node.js 24 and [pnpm](https://pnpm.io)
- A browser

**Things only you can provide.** Collect these first; the guide tells you where
each one goes.

| You need | Where to get it | Used for |
| --- | --- | --- |
| A GitHub account that can create a GitHub App | github.com | Sign-in and repository access |
| A **Coder Premium licence** (a trial is fine) | Request a trial licence from Coder (coder.com) | Creating organisations in Coder. Without it, organisation setup fails |
| An **AI provider** account with credit: API key, base URL and a model name | Your provider (OpenAI-compatible, OpenRouter, ...) | The agents' chats. Without it every agent fails at once |
| A GitHub repository you can install the App on | github.com | The tenant the agents work on |

**Manager version.** The Console needs Manager endpoints that are in the pull
request "Console API" (#523) of the OpenFlows repository. Until it is merged to
`develop`, use its branch:

```sh
cd ~/openflows
git fetch origin
git checkout feat/console-manager-api
```

## 1. Create the GitHub App

In GitHub open *Settings -> Developer settings -> GitHub Apps -> New GitHub
App* and fill in:

- **Callback URLs** (add all three, one per line):
  ```
  http://localhost:3000/auth/github/callback
  http://localhost:3000/api/v1/github/oauth/callback
  http://localhost:7080/api/v2/users/oauth2/github/callback
  ```
  The first two are the Console's sign-in and "connect GitHub" returns. The
  third is Coder's own GitHub sign-in.
- **Setup URL:** `http://localhost:3000/api/v1/github/setup`
- **Webhook:** untick *Active* (not needed locally).
- **Repository permissions:** Contents, Issues and Pull requests: *Read and
  write*. Checks, Commit statuses and Actions: *Read-only*. Workflows: *Read and
  write*. Do not grant Administration.
- **Organisation permissions:** Members: *Read-only*.
- **Account permissions:** Email addresses: *Read-only*. Without it Coder
  sign-in fails with a 403 on `/user/emails`.

Click *Create GitHub App*, then collect and keep somewhere private:

1. **App ID** and the App's **slug** (the last part of its public URL)
2. **Client ID**, and a generated **client secret**
3. A generated **private key** (a `.pem` file; GitHub downloads it)
4. A **webhook secret** (type any random string when asked)

Finally *Install App* on your account and give it access to the repository you
want the agents to work on.

## 2. Configure OpenFlows

```sh
cd ~/openflows
cp .env.openflows.example .env.openflows
chmod 600 .env.openflows
```

Open `.env.openflows` and set these values. Leave every other line as it is.

```sh
# Where the Console lives. Manager builds sign-in redirects from it.
OPENFLOWS_PUBLIC_URL=http://localhost:3000
OPENFLOWS_AUTH_ALLOW_LOOPBACK=true        # allows plain HTTP on localhost
OPENFLOWS_AUTH_COOKIE_SECURE=false        # session cookie over HTTP (local only)

# Passwords for the two local databases: make up any value
OPENFLOWS_PG_PASSWORD=<password-1>
CODER_PG_PASSWORD=<password-2>
OPENFLOWS_DATABASE_URL=postgres://openflows:<password-1>@127.0.0.1:5544/openflows_control_plane

# Coder
CODER_URL=http://localhost:7080
CODER_CHAT_HOOK_ALLOW_INSECURE=true       # local HTTP only
CODER_OAUTH2_GITHUB_CLIENT_ID=<your GitHub App client ID>
CODER_OAUTH2_GITHUB_ALLOWED_ORGS=
CODER_OAUTH2_GITHUB_ALLOW_EVERYONE=true

# Your GitHub App
OPENFLOWS_GITHUB_CLIENT_ID=<your GitHub App client ID>
OPENFLOWS_GITHUB_APP_ID=<your App ID>
OPENFLOWS_GITHUB_APP_SLUG=<your App slug>

# Where secret files live (an absolute path) and who can read them (see below)
OPENFLOWS_SECRET_DIR=/home/<you>/openflows/.openflows/secrets
OPENFLOWS_SECRET_FILE_MODE=0644

# Docker networking (the compose project is named "openflows")
OPENFLOWS_PROVISIONER_NETWORK=openflows_default
OPENFLOWS_PROVISIONER_CODER_URL=http://coder:7080
TF_VAR_docker_network=openflows_default
TF_VAR_dev_binary_host_path=/home/<you>/openflows/.dev-binaries
```

`OPENFLOWS_WORKSPACE_IMAGE_DIGEST` must also be set to a real value. It is the
digest of the image every agent workspace runs. Get it with:

```sh
docker pull codercom/enterprise-base:ubuntu
docker inspect --format '{{index .RepoDigests 0}}' codercom/enterprise-base:ubuntu
```

The output looks like `codercom/enterprise-base@sha256:...`. Put everything
after the `@` (starting with `sha256:`) in `.env.openflows`:

```sh
OPENFLOWS_WORKSPACE_IMAGE_DIGEST=sha256:<digits from the command above>
```

Then the two lines that depend on your operating system:

- **Linux.** Containers cannot reach a Manager bound to `127.0.0.1`. Find the
  Docker bridge address with `ip -4 addr show docker0` (usually `172.17.0.1`)
  and set:
  ```sh
  OPENFLOWS_MANAGER_ADDR=172.17.0.1:3002
  OPENFLOWS_RUNTIME_MANAGER_URL=http://172.17.0.1:3002
  ```
- **macOS or Windows (Docker Desktop).** Leave `OPENFLOWS_RUNTIME_MANAGER_URL`
  as it is, and set `OPENFLOWS_MANAGER_ADDR=0.0.0.0:3002`.

### Secret files

```sh
cd ~/openflows
mkdir -p .openflows/secrets
chmod 700 .openflows/secrets                       # must be 700: see the Linux note
printf '%s' "$(openssl rand -hex 32)" > .openflows/secrets/coder-hook-secret
```

Create four more files in `.openflows/secrets`, each containing exactly the
value named, with no trailing text:

| File | Content |
| --- | --- |
| `github-client-secret` | the GitHub App client secret |
| `coder-github-client-secret` | the same client secret again |
| `github-app-private-key` | the full contents of the downloaded `.pem` file |
| `github-webhook-secret` | the webhook secret |

Then `chmod 600 .openflows/secrets/*`.

> **Linux note.** Agents run as a different user (uid 1000) from you. With
> `OPENFLOWS_SECRET_FILE_MODE=0644` Manager makes the runtime credential
> readable inside the workspace, which is safe only because the directory itself
> is mode 700, so other users on your machine cannot reach the files. Without
> this the agent fails with "Permission denied" on `/run/openflows/runtime.json`
> and never gets past planning. macOS does not need it.

## 3. Build the workspace binaries

```sh
cd ~/openflows
make dev-sync
```

This builds the controller and harness that every agent workspace mounts, into
`.dev-binaries/`. It uses Docker and takes a few minutes. If it stops with "not
owned by <you> (left by an earlier root build)", run the `chown` command it
prints once and repeat `make dev-sync`.

## 4. Start OpenFlows

```sh
cd ~/openflows
docker compose --env-file .env.openflows -f deployment.compose.yml up -d
```

Wait until `docker compose --env-file .env.openflows -f deployment.compose.yml ps`
shows Coder running (about 30 seconds), then:

```sh
cargo run -p openflows-manager -- --config .env.openflows setup
cargo run -p openflows-manager -- --config .env.openflows doctor
```

`setup` creates Coder's first administrator, the Manager's Coder token and the
OAuth application used to link Coder accounts. `doctor` must end with
`Checks passed`; fix any `FAIL` line before continuing. Then start Manager and
leave this terminal open:

```sh
cargo run -p openflows-manager -- --config .env.openflows serve
```

In another terminal check it is ready (use your `OPENFLOWS_MANAGER_ADDR`):

```sh
curl http://172.17.0.1:3002/ready      # Linux; use 127.0.0.1:3002 on macOS
```

You should see `"status":"ready"`.

## 5. Add the Coder licence

Coder needs the Premium licence before it can create the organisation you are
about to make. Add it once, either way:

**In Coder.** Log in at `http://localhost:7080` as `platform-admin@example.com`
with the password `setup` stored in
`~/openflows/.openflows/secrets/coder-bootstrap-password`
(`cat` it to read it). Open *Deployment -> Licenses* and paste your licence key.

**Or from a terminal.** Put the key in a file called `coder-licence.txt` and run:

```sh
cd ~/openflows
curl -sS -X POST http://localhost:7080/api/v2/licenses \
  -H "Coder-Session-Token: $(cat .openflows/secrets/coder-operator-token)" \
  -H 'Content-Type: application/json' \
  -d "{\"license\":\"$(cat coder-licence.txt)\"}"
```

## 6. Start the Console

```sh
cd ~/openflows-console
cp .env.example .env.local
```

In `.env.local` set the one required setting to Manager's address, the same
one you checked in step 4:

```sh
OPENFLOWS_MANAGER_URL=http://172.17.0.1:3002     # Linux; http://127.0.0.1:3002 on macOS
```

Then:

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The Console reads `.env.local` when it starts, so
restart `pnpm dev` if you change it.

## 7. First run

1. **Sign in.** Choose *Continue with GitHub*. You land on *Create your
   organisation*.
2. **Create an organisation.** Enter a name and create it. The Console shows
   setup progress while Manager creates the Coder organisation, a provisioner
   and the workspace templates. The first one takes about 4 minutes. It ends as
   *ready*. If it shows a failure, see Troubleshooting.
3. **Link your Coder account.** Open *Account* in the Console and sign in to
   Coder with GitHub when asked. Agent chats belong to this Coder user.
4. **Give Coder an AI model.** Open `http://localhost:7080` -> *Agents ->
   Settings -> Models*. Switch to your new organisation (its name starts with
   `of-`), add your provider (base URL and API key) and a model, and mark it
   **Default**. Set the model's *max output tokens* to a value your provider
   accepts and its *context limit* to the model's real size. If your GitHub user
   cannot see this screen, log in as `platform-admin@example.com` (step 5).
5. **Connect GitHub.** In the Console open *GitHub* -> *Connect GitHub* and
   install the App on the account that owns your repository.
6. **Create a tenant.** Open *Tenants -> New tenant* and choose the repository.
   Wait for the tenant to be *Running* and its runtime *Responding*.
7. **Give it work.** Open an issue in that repository. Within a minute or two
   Nexus turns it into a ticket and starts a Forge agent. The tenant page's
   *Agent activity* card shows each agent's ticket and status. Forge plans,
   Sentinel reviews, Forge builds and opens a pull request. You review and merge
   it.

If an agent fails, the card says why in plain language (for example the AI
provider's credit limit) and the notification bell raises an alert. Fix the
cause, then *Stop* and *Start* the tenant for a fresh agent session.

## 8. Run the tests

```sh
cd ~/openflows-console
pnpm lint
pnpm typecheck
pnpm test          # unit tests; no services needed
pnpm test:e2e      # browser tests; needs Google Chrome installed
```

The browser tests do not need OpenFlows: they run the real Console against a
small fake Manager and build into `.next-e2e`, so `pnpm dev` is not disturbed.

## 9. Stop, or start over

To stop everything: press Ctrl+C in the Manager and Console terminals, then:

```sh
cd ~/openflows
docker compose --env-file .env.openflows -f deployment.compose.yml down
```

This keeps your data. To start completely clean, add `-v` (this deletes the
Coder and OpenFlows databases, so you must add the licence again), remove
workspace containers with `docker ps -a --filter name=openflows- -q | xargs -r docker rm -f`,
and delete the whole `.openflows` folder. Then redo the secret files in step 2
and steps 4 and 5.

## Troubleshooting

Most problems come from the OpenFlows stack rather than the Console; the
runbook covers those (Linux networking, secret file permissions, template
release names, Coder tokens). The ones you meet from the Console:

| Symptom | Cause and fix |
| --- | --- |
| Manager refuses to start: "public origin requires HTTPS" | Set `OPENFLOWS_AUTH_ALLOW_LOOPBACK=true` (step 2) |
| Coder keeps restarting: "chat hook URL must use HTTPS" | Set `CODER_CHAT_HOOK_ALLOW_INSECURE=true` in `.env.openflows` and run `docker compose ... up -d` again |
| GitHub says the callback URL is not allowed | Add the three callback URLs from step 1 to the GitHub App |
| Coder sign-in returns 403 on `/user/emails` | Add *Email addresses: Read-only* to the GitHub App and accept the new permission |
| Organisation setup fails with "OpenFlows could not create your organisation in Coder" | The Coder licence is missing or expired (step 5) |
| Organisation setup fails at *publish templates* (`IMPORT_FAILED`) and *Retry* does not help | Manager gives up after three failed imports and remembers them as failed template versions in Coder. Fix the cause, then delete the `openflows-nexus` template in that Coder organisation (Coder: *Templates*, the template's settings, *Delete*) so the retry starts clean, and press *Retry* in the Console |
| "configured template release differs from immutable" | You changed a template. Set a new `OPENFLOWS_RELEASE_NAME` and restart Manager |
| Provisioner `PROVISIONER_NOT_READY`, or "Could not resolve host.docker.internal" | Check the Docker networking values in step 2, and on Linux that Manager is bound to the Docker bridge address |
| Agent stuck at planning, "Permission denied" on `runtime.json` | Linux file ownership: see the Linux note in step 2 |
| Agent fails with `AI_USAGE_LIMIT` | The AI provider refused for credit or usage; add credit or change the model |
| Agent fails with `AI_AUTH_FAILED` | The provider key in Coder is wrong, expired or has stray whitespace |
| Agent fails with HTTP 413 from the provider | Lower the model's max output tokens and set its real context limit in Coder |
| Tenant stays *Provisioning* | Open the tenant's latest operation for the failing step; delete and recreate the tenant if it cannot recover |
| An organisation stays *Deleting* | Manager queues deletion but no worker finishes it yet |
