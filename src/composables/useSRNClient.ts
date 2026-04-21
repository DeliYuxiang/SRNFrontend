import type { Ref } from "vue";
import type { Identity, Challenge, SRNEvent, TMDBResult } from "../types/api";
import type { paths } from "../types/srn-api";
import { createSRNClient } from "../lib/apiClient";

/** Query parameters accepted by GET /v1/events */
export type EventsQuery = NonNullable<
  paths["/v1/events"]["get"]["parameters"]["query"]
>;

/**
 * Raw event shape returned by the API.
 * `tags` is a JSON-encoded string (stored as TEXT in D1);
 * `tmdb_id` is a string (query param coercion) or null.
 */
type RawEvent =
  paths["/v1/events"]["get"]["responses"]["200"]["content"]["application/json"]["events"][number];

/** Map a raw API event to the app's SRNEvent type. */
function mapEvent(e: RawEvent): SRNEvent {
  return {
    ...e,
    tmdb_id: e.tmdb_id != null ? Number(e.tmdb_id) : 0,
    // Schema optional fields may be undefined; SRNEvent requires null.
    season_num: e.season_num ?? null,
    episode_num: e.episode_num ?? null,
    language: e.language ?? null,
    archive_md5: e.archive_md5 ?? null,
    source_type: e.source_type ?? null,
    source_uri: e.source_uri ?? null,
    // D1 stores tags as a JSON string; parse it into the nested array the
    // rest of the app expects.
    tags:
      typeof e.tags === "string"
        ? (JSON.parse(e.tags) as string[][])
        : (e.tags as unknown as string[][]),
  };
}

export function useSRNClient(
  identity: Ref<Identity | null>,
  privKey: Ref<CryptoKey | null>,
  challenge: Ref<Challenge>,
  refreshChallenge: (pubHex: string) => Promise<void>,
) {
  const { client, withRetry, downloadContent } = createSRNClient(
    identity,
    privKey,
    challenge,
    refreshChallenge,
  );

  /** Search subtitle events. All query params are optional. */
  async function searchEvents(query: EventsQuery = {}): Promise<SRNEvent[]> {
    const result = await withRetry(() =>
      client.GET("/v1/events", { params: { query } }),
    );
    return result.data?.events.map(mapEvent) ?? [];
  }

  /**
   * Search TMDB for a title.
   * @param fresh - bypass the relay's cache (useful when re-querying after
   *                a metadata update)
   */
  async function searchTMDB(q: string, fresh?: boolean): Promise<TMDBResult[]> {
    const result = await withRetry(() =>
      client.GET("/v1/tmdb/search", {
        params: { query: { q, ...(fresh ? { fresh: "1" } : {}) } },
      }),
    );
    if (!result.data) return [];
    return result.data.results.map((r) => ({
      id: r.id,
      name: r.name || undefined,
      title: r.title || undefined,
      poster_path: r.poster_path,
      media_type: r.media_type,
      first_air_date: r.first_air_date || undefined,
      release_date: r.release_date || undefined,
    }));
  }

  /**
   * Fetch the episode count for a specific TMDB season.
   * Returns null when the relay doesn't have the data.
   */
  async function getSeasonInfo(
    tmdbId: number,
    season: number,
  ): Promise<number | null> {
    const result = await withRetry(() =>
      client.GET("/v1/tmdb/season", {
        params: {
          query: { tmdb_id: String(tmdbId), season: String(season) },
        },
      }),
    );
    return result.data?.episode_count ?? null;
  }

  return {
    searchEvents,
    searchTMDB,
    getSeasonInfo,
    downloadContent,
    // Exposed for callers that need direct typed access or custom requests.
    client,
    withRetry,
  };
}
