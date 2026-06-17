# Homeward — Lost Pet Recovery Network

Structured, geo-aware network for recovering lost pets, with a **bird & exotic** focus.
Source of truth: [`docs/homeward-spec.md`](docs/homeward-spec.md). Build is **phase-by-phase** (spec §16).

> **Current status: Phase 0 — Foundation.** Monorepo, config, MongoDB/Redis/Cloudinary
> wiring, and authentication (email/password + LINE Login *stub*) with `/me`.
> No app features yet (bird passports, sightings, matching land in Phase 1+).

## Layout

```
apps/
  api/      Express + TypeScript API (auth, /me, /health)
  web/      React + Vite PWA shell (LIFF-ready login + /me view)
packages/
  shared/   Shared TS types + zod schemas (imported by api & web)
docs/
  homeward-spec.md   The engineering spec (authoritative)
docker-compose.yml   MongoDB + Redis for local dev
```

## Prerequisites

- Node ≥ 20 (tested on 24)
- pnpm (`npm install -g pnpm` or `corepack enable pnpm`)
- Docker (optional — only for running MongoDB/Redis locally; tests don't need it)

## Quick start

```bash
pnpm install
cp .env.example .env        # adjust JWT_SECRET etc.

# Option A — full local dev (needs Docker for Mongo/Redis)
docker compose up -d
pnpm dev                    # api on :4000, web on :5173

# Option B — just run the test suite (no Docker; uses in-memory MongoDB)
pnpm test
```

## Phase 0 acceptance

> *A user can sign in and fetch `/me`.*

Verifiable without LINE credentials via the **email/password fallback**:

```bash
# register → cookie set
curl -i -X POST localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"a@b.com","password":"password123","displayName":"Ada"}'

# with the cookie jar, fetch the session user
curl -b cookies.txt localhost:4000/me
```

The `POST /auth/line` route is implemented against a swappable verifier; with no
`LINE_CHANNEL_ID` set it uses a **dev stub**, and switches to real JWKS
verification automatically once channel credentials are provided.

## Scripts (root)

| Command | Description |
|---|---|
| `pnpm dev` | Run api + web in parallel |
| `pnpm test` | Run all package test suites |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | ESLint across the repo |
| `pnpm format` | Prettier write |
