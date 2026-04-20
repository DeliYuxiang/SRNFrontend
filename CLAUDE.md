# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SRN Frontend — Vue 3 + Vite SPA for the **Subtitle Relay Network (SRN)**. Deployed to Cloudflare Pages; connects to the SRN Worker API at `https://srn.majiyabakunai.moe`.

## Commands

```bash
npm run dev          # Start dev server (proxies /v1/* to production API)
npm run build        # Type-check with vue-tsc, then build to dist/
npm run preview      # Preview the production build locally
npm run format:check # Check formatting (CI gate)
npm run format:fix   # Auto-fix formatting
```

There is no test suite. CI (`ci.yml`) runs `format:check` and `build` on PRs.

## Architecture

### Authentication flow

Every API request requires a client identity and a solved Proof-of-Work challenge:

1. **`useIdentity`** (`src/composables/useIdentity.ts`) — generates or loads an Ed25519 keypair from `localStorage` (`srn_identity_v3`). Exports `identity` (pubHex/privHex) and `privKey` (a `CryptoKey`).

2. **`usePoW`** (`src/composables/usePoW.ts`) — fetches a challenge from `/v1/challenge` (salt + difficulty `k`), then spawns a Web Worker to mine a SHA-256 nonce. The worker posts progress every 500 attempts.

3. **`useSRNClient`** (`src/composables/useSRNClient.ts`) — wraps `fetch` with auth headers (`X-SRN-PubKey`, `X-SRN-Nonce`, `X-SRN-Signature`). Regular requests sign the pubkey hex; download requests sign the current minute timestamp. On 401/403 it auto-refreshes the challenge and retries once.

### PoW Worker

`src/workers/pow.worker.ts` runs in a dedicated Web Worker. It receives a `PowWorkerRequest` and iterates nonces until `SHA-256(salt + pubHex + nonce)` starts with `k` leading zeros. Bundled by Vite using `new Worker(new URL(...), { type: 'module' })`.

### Data model

`src/types/api.ts` defines all shared types. Key ones:
- `SRNEvent` — a subtitle record with TMDB metadata, season/episode, language, and archive references.
- `ArchiveGroup → SeasonGroup → LangGroup → SRNEvent[]` — the hierarchy used to display grouped results in `App.vue`.
- `Challenge` — salt, difficulty `k`, solved `nonce`, and `vip` flag.

### Dev proxy

`vite.config.ts` proxies `/v1/*` to the production API so local dev works without CORS issues. `/favicon.svg` proxies to a local Cloudflare Worker on port 8787 (optional).

### Shared utility

`src/utils/hex.ts` exports `bytesToHex(ArrayBuffer): string` — used by the PoW worker, identity composable, and SRN client. Import from there rather than inlining.

## Deployment

Merges to `main` deploy automatically to Cloudflare Pages via `deploy.yml`. PRs get a preview URL commented on them. Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
