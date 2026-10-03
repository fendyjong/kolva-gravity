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
