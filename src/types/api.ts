export interface Identity {
  pubHex: string;
  privHex: string;
}

export interface Challenge {
  salt: string;
  k: number;
  nonce: string;
  vip: boolean;
}

export interface SRNEvent {
  id: string;
  pubkey: string;
  kind: number;
  content_md5: string;
  tags: string[][];
  sig: string;
  created_at: number;
  tmdb_id: number;
  season_num: number | null;
  episode_num: number | null;
  language: string | null;
  archive_md5: string | null;
  source_type: string | null;
  source_uri: string | null;
  filename?: string;
}

export interface TMDBResult {
  id: number;
  name?: string;
  title?: string;
  poster_path: string | null;
  media_type: "tv" | "movie";
  first_air_date?: string;
  release_date?: string;
}

// Grouping types for display
export interface LangGroup {
  items: SRNEvent[];
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
  pubkey: string;   // RELAY_PUBLIC_KEY from /v1/identity, "" if unset
  healthy: boolean; // false if fetch fails or returns non-2xx
  version: string;  // worker version from /v1/identity, "" if unavailable
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
