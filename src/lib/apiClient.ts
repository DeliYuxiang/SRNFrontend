import createClient, { type Middleware } from "openapi-fetch";
import type { Ref } from "vue";
import type { paths } from "../types/srn-api";
import type { Identity, Challenge } from "../types/api";
import { buildAuthHeaders } from "@srn/client";
import { API_BASE } from "../config";

/**
 * Whether a URL path targets the download endpoint.
 *
 * Downloads use a time-based signature (current minute) to prevent replay
 * attacks, while all other endpoints sign the client's public key.
 */
function isDownloadPath(url: string): boolean {
  return /\/v1\/events\/[^/]+\/content/.test(new URL(url).pathname);
}

export function createSRNClient(
  identity: Ref<Identity | null>,
  privKey: Ref<CryptoKey | null>,
  challenge: Ref<Challenge>,
  refreshChallenge: (pubHex: string) => Promise<void>,
) {
  const client = createClient<paths>({ baseUrl: API_BASE });

  /**
   * Middleware that injects PoW auth headers into every request.
   * Reads the latest challenge nonce from the reactive ref so the
   * middleware is always in sync after a PoW refresh.
   */
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const id = identity.value;
      const key = privKey.value;
      if (!id || !key) return;

      const message = isDownloadPath(request.url)
        ? String(Math.floor(Date.now() / 60000))
        : id.pubHex;

      const headers = await buildAuthHeaders(
        id.pubHex,
        key,
        challenge.value.nonce,
        message,
      );
      for (const [k, v] of Object.entries(headers)) {
        request.headers.set(k, v);
      }
      return request;
    },
  };

  client.use(authMiddleware);

  /**
   * Runs fn; on 401/403 refreshes the PoW challenge and retries once.
   *
   * The middleware automatically picks up the new nonce on the retry
   * because it reads challenge.value at call time.
   */
  async function withRetry<T extends { response: Response }>(
    fn: () => Promise<T>,
  ): Promise<T> {
    const result = await fn();
    const s = result.response.status;
    if ((s === 401 || s === 403) && identity.value) {
      await refreshChallenge(identity.value.pubHex);
      return fn();
    }
    return result;
  }

  /**
   * Download a subtitle file by event ID.
   *
   * Uses raw fetch rather than the typed client because the response is
   * application/octet-stream (binary); openapi-fetch returns data as unknown
   * for binary responses, so callers would need to read result.response
   * directly anyway.
   *
   * The download signature uses the current UTC minute (not pubHex) to
   * match the server's verifyDownloadRequest logic.
   */
  async function downloadContent(eventId: string): Promise<Response> {
    const id = identity.value!;
    const key = privKey.value!;

    async function doFetch(): Promise<Response> {
      const minute = String(Math.floor(Date.now() / 60000));
      const headers = await buildAuthHeaders(
        id.pubHex,
        key,
        challenge.value.nonce,
        minute,
      );
      return fetch(`${API_BASE}/v1/events/${eventId}/content`, { headers });
    }

    let res = await doFetch();
    if ((res.status === 401 || res.status === 403) && identity.value) {
      await refreshChallenge(id.pubHex);
      res = await doFetch();
    }
    return res;
  }

  return { client, withRetry, downloadContent };
}
