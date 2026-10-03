# Gravity

A one-person priority matrix with no due dates. Every task sits in one of four quadrants, and the top-left one — **Do today** — is a commitment: everything in it is due today. An LLM rearranges the matrix on demand over MCP.

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

Everything is in `data/gravity.db`. Stop the container so SQLite folds its write-ahead log into the file, copy it, and start again:

```bash
docker compose stop
cp data/gravity.db "gravity-$(date +%F).db"
docker compose start
```

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
