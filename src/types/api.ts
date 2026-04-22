// Protocol types — canonical definitions live in @srn/client.
// Re-exported here so callers can import from a single location.
export type { Identity, SRNEvent, TMDBResult } from "@srn/client";
import type { ChallengeParams } from "@srn/client";

// Challenge extends the relay's ChallengeParams with the locally-mined nonce.
// ChallengeParams = { salt, k, vip }; nonce is computed by the PoW worker.
export type Challenge = ChallengeParams & { nonce: string };

// Grouping types for display
export interface LangGroup {
  items: import("@srn/client").SRNEvent[];
}

export interface SeasonGroup {
  season: number | null;
  languages: Record<string, LangGroup>;
}

export interface ArchiveGroup {
  key: string;
  archive_md5: string | null;
  source_uri: string | null;
  source_type: string | null;
  pubkey: string;
  tmdb_id: number;
  group: string | null;
  seasons: Record<string | number, SeasonGroup>;
}

export interface RelayStatus {
  pubkey: string; // RELAY_PUBLIC_KEY from /v1/identity, "" if unset
  healthy: boolean; // false if fetch fails or returns non-2xx
  version: string; // worker version from /v1/identity, "" if unavailable
}

// PoW worker messages
export interface PowWorkerRequest {
  salt: string;
  pubHex: string;
  k: number;
}

export interface PowWorkerProgress {
  type: "progress";
  attempts: number;
}

export interface PowWorkerResult {
  type: "result";
  nonce: string;
}

export type PowWorkerMessage = PowWorkerProgress | PowWorkerResult;
