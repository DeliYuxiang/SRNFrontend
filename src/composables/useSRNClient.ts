import type { Ref } from "vue";
import type { Identity, Challenge } from "../types/api";
import { bytesToHex } from "../utils/hex";

export function useSRNClient(
  identity: Ref<Identity | null>,
  privKey: Ref<CryptoKey | null>,
  challenge: Ref<Challenge>,
  refreshChallenge: (pubHex: string) => Promise<void>,
) {
  async function authHeaders(
    message: string,
  ): Promise<Record<string, string>> {
    const id = identity.value!;
    const key = privKey.value!;
    const sig = await crypto.subtle.sign(
      "Ed25519",
      key,
      new TextEncoder().encode(message),
    );
    return {
      "X-SRN-PubKey": id.pubHex,
      "X-SRN-Nonce": challenge.value.nonce,
      "X-SRN-Signature": bytesToHex(sig),
    };
  }

  async function srnFetch(
    url: string,
    opts: RequestInit = {},
    retrying = false,
  ): Promise<Response> {
    const id = identity.value!;
    const headers = {
      ...(opts.headers as Record<string, string> | undefined),
      ...(await authHeaders(id.pubHex)),
    };
    const res = await fetch(url, { ...opts, headers });

    if ((res.status === 401 || res.status === 403) && !retrying) {
      await refreshChallenge(id.pubHex);
      return srnFetch(url, opts, true);
    }
    return res;
  }

  async function srnFetchDownload(
    url: string,
    opts: RequestInit = {},
    retrying = false,
  ): Promise<Response> {
    const id = identity.value!;
    const minute = String(Math.floor(Date.now() / 60000));
    const sig = await crypto.subtle.sign(
      "Ed25519",
      privKey.value!,
      new TextEncoder().encode(minute),
    );
    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string> | undefined),
      "X-SRN-PubKey": id.pubHex,
      "X-SRN-Nonce": challenge.value.nonce,
      "X-SRN-Signature": bytesToHex(sig),
    };

    const res = await fetch(url, { ...opts, headers });

    if ((res.status === 401 || res.status === 403) && !retrying) {
      await refreshChallenge(id.pubHex);
      return srnFetchDownload(url, opts, true);
    }
    return res;
  }

  return { srnFetch, srnFetchDownload };
}
