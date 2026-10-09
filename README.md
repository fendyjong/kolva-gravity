# Gravity

A one-person priority matrix with no due dates. Every task sits in one of four quadrants, and the top-left one — **Next version** — is the checklist of everything to finish before your next release. An LLM plans it on demand over MCP.

It runs as one Docker container (Next.js + an MCP endpoint + SQLite) at `https://gravity.local.zeven.day`.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000, data in ./data/gravity.db
pnpm test         # Vitest
pnpm validate     # everything CI runs
```

## Deploy

The host port is claimed in the homelab port registry, never picked by hand:

```bash
portctl resolve gravity   # https://gravity.local.zeven.day -> http://192.168.7.30:17016
```

On host .30, from this repository:

```bash
mkdir -p data                  # must exist before the first `up`, owned by your user
docker compose up -d --build
portctl generate               # (re)deploys the Traefik route
curl -I https://gravity.local.zeven.day
```

The database lives in `./data/gravity.db` on the host (`/data/gravity.db` in the container).

## Back up

Everything is in `data/`. Stopping the container closes the database, which folds the write-ahead log into `gravity.db`. Stop, copy every database file (so the copy is complete even if a `gravity.db-wal` is ever left behind), and start again:

```bash
docker compose stop
mkdir -p "backup-$(date +%F)" && cp data/gravity.db* "backup-$(date +%F)/"
docker compose start
```

To restore, stop the container, copy the files from the backup directory back into `data/`, and start it.

## MCP

Gravity serves MCP over Streamable HTTP at `https://gravity.local.zeven.day/mcp`: stateless, `POST` only, and without auth — anyone on the LAN or the WireGuard VPN can call it.

Claude Code:

```bash
claude mcp add --transport http --scope user gravity https://gravity.local.zeven.day/mcp
claude mcp list   # gravity should show as connected
```

Any other MCP client:

```json
{ "mcpServers": { "gravity": { "type": "http", "url": "https://gravity.local.zeven.day/mcp" } } }
```

Tools: `get_matrix`, `add_task`, `update_task`, `move_task`, `reorder_quadrant`, `complete_task`, `reopen_task`, `drop_task`. A broken rule comes back as an error result that says what is needed, e.g. `task 12 is completed; reopen it first`.

## Triage

Quadrant 1, **Next version**, is the checklist for your next release. Gravity knows nothing about deployments: you tick the list off and deploy by hand, at least once a week. Triage keeps the list current and small.

With the `gravity` MCP server added to Claude Code (see above), run:

```
/mcp__gravity__triage fendyjong/ai-automatic-engagement,fendyjong/kolva-gravity
```

The one argument, `repos`, is an optional comma-separated `owner/repo` list. The prompt (`lib/mcp/triage.md`) has the LLM:

1. read the matrix;
2. complete tasks whose issues have closed;
3. deal with tasks 7 days or more in Next version: urgent ones stay, issue-linked ones move to Schedule, others are split or moved down;
4. move up tasks in Delegate and Later that keep getting put off;
5. add every urgent issue from `repos` (`URGENT` in the title, or a `bug` hurting production), then the next issues of each repo's earliest open version milestone (e.g. `v1.x.x - …`), in dependency order, while Next version stays within a **10-point** budget (`size:S` 1, `size:M` 2, `size:L` 4, unsized 2);
6. top up from Schedule while the budget allows;
7. reorder every quadrant;
8. finish with a short summary, including points used.

Running it again creates no duplicates. Triage only reads GitHub; it never changes issues, labels or milestones. The budget and the 7-day threshold are constants in `lib/limits.ts`. Steps 2 and 5 need the `gh` CLI, logged in, wherever the LLM runs.
