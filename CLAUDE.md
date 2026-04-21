# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SRN Frontend — Vue 3 + Vite SPA for the **Subtitle Relay Network (SRN)**.

### Deployment architecture

```
Browser / Feeder
      │
      ▼
SRN Worker  (srn-worker.delibill.workers.dev / custom domain)
  ├─ /v1/*   → Hono API routes (D1, R2, PoW auth)
  ├─ /ui     → Scalar API docs
  └─ /*      → proxied to CF Pages  ◄── this repo's output
                  (index.html: no-cache, /assets/*: immutable)
```

The worker is the **single entry point** for both the API and the frontend. The frontend is built and deployed independently to Cloudflare Pages; the worker fetches it at request time. Hashed asset filenames (Vite default) mean browsers cache `/assets/*` forever and pick up updates automatically when `index.html` changes — no worker redeployment needed for frontend releases.

`VITE_API_BASE` is intentionally left empty at build time. All API calls use relative paths (`/v1/…`), which resolve to the worker's own domain.

## Commands

```bash
npm run dev           # Start dev server (proxies /v1/*, /ui, /doc, /favicon.svg to the worker)
npm run build         # Type-check with vue-tsc, then build to dist/
npm run preview       # Preview the production build locally
npm run format:check  # Check formatting (CI gate)
npm run format:fix    # Auto-fix formatting
npm run generate:api  # Regenerate src/types/srn-api.d.ts from the live worker OpenAPI schema
```

There is no test suite. CI (`ci.yml`) runs `generate:api`, `format:check`, and `build` on PRs (in that order). The deploy workflow (`deploy.yml`) also runs `generate:api` before building.

## Architecture

### Authentication flow

Every API request requires a client identity and a solved Proof-of-Work challenge:

1. **`useIdentity`** (`src/composables/useIdentity.ts`) — generates or loads an Ed25519 keypair from `localStorage` (`srn_identity_v3`). Exports `identity` (pubHex/privHex) and `privKey` (a `CryptoKey`). A modal in `App.vue` lets users import an existing raw-hex keypair; the raw 32-byte seed is wrapped into PKCS8 format before storage.

2. **`usePoW`** (`src/composables/usePoW.ts`) — fetches a challenge from `/v1/challenge` (salt + difficulty `k`), then spawns a Web Worker to mine a SHA-256 nonce. The worker posts progress every 500 attempts.

3. **`useSRNClient`** (`src/composables/useSRNClient.ts`) — thin wrapper around `createSRNClient` (from `src/lib/apiClient.ts`). Provides typed methods `searchEvents`, `searchTMDB`, `getSeasonInfo`, and `downloadContent`. On 401/403 it auto-refreshes the PoW challenge and retries once.

4. **`src/lib/apiClient.ts`** — the actual HTTP client factory. Creates an `openapi-fetch` client typed against `src/types/srn-api.d.ts`, registers an auth middleware that injects `X-SRN-PubKey`, `X-SRN-Nonce`, and `X-SRN-Signature` headers. Regular requests sign the pubkey hex; download requests sign the current UTC minute (anti-replay).

### PoW Worker

`src/workers/pow.worker.ts` runs in a dedicated Web Worker. It receives a `PowWorkerRequest` and iterates nonces until `SHA-256(salt + pubHex + nonce)` starts with `k` leading zeros. Bundled by Vite using `new Worker(new URL(...), { type: 'module' })`.

### API endpoints used

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/challenge` | Fetch PoW salt + difficulty |
| GET | `/v1/relay` | Relay stats (totalEvents, uniqueTitles, uniqueEpisodes) |
| GET | `/v1/identity` | Relay pubkey + worker version |
| GET | `/v1/events` | Search subtitle events by tmdb/season/ep/language |
| GET | `/v1/events/:id/content` | Download subtitle file |
| GET | `/v1/tmdb/search` | TMDB title search (proxied through worker) |
| GET | `/v1/tmdb/season` | Episode count for a TMDB season |

### Data model

`src/types/api.ts` defines all shared types. Key ones:
- `SRNEvent` — a subtitle record with TMDB metadata, season/episode, language, and archive references.
- `ArchiveGroup → SeasonGroup → LangGroup → SRNEvent[]` — the hierarchy used to display grouped results in `App.vue`.
- `Challenge` — salt, difficulty `k`, solved `nonce`, and `vip` flag.
- `RelayStatus` — relay pubkey, health boolean, and worker version string (populated from `/v1/relay` + `/v1/identity` at startup).

`src/types/srn-api.d.ts` is auto-generated from the worker's OpenAPI schema via `npm run generate:api`. Do not edit it by hand.

### Component tree

```
App.vue
  ├─ NavBar.vue          — logo, relay health chip, client pubkey chip, PoW status, import-key button
  ├─ (import modal)      — inline in App.vue; imports raw-hex Ed25519 keypair
  ├─ SearchBar.vue        — text input, TMDB toggle, search button
  │    └─ AutocompleteDropdown.vue — TMDB search suggestions with poster thumbnails
  └─ ResultsGrid.vue      — grid of search results (or LoadingCard skeletons)
       ├─ LoadingCard.vue  — shimmer placeholder shown while fetching
       └─ ArchiveCard.vue  — one card per subtitle archive group; shows season/lang rows with episode pills
```

### Dev proxy

`vite.config.ts` proxies `/v1/*`, `/ui`, `/doc`, and `/favicon.svg` to the worker so local dev works without CORS issues.

### Shared utility

`src/utils/hex.ts` exports `bytesToHex(ArrayBuffer): string` — used by the PoW worker, identity composable, and SRN client. Import from there rather than inlining.

## Deployment

Merges to `main` deploy automatically to Cloudflare Pages via `deploy.yml`. PRs also trigger a deploy and get a preview URL commented on them. The CF Pages URL is only the CDN origin — users should access the app through the worker's domain. Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

<!-- doc-sha: 07a7fda972951778c3ac11528e074ae5162dd1fe -->
