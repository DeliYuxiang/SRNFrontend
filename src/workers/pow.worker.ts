import type { PowWorkerRequest, PowWorkerMessage } from "../types/api";
import { bytesToHex } from "../utils/hex";

const encoder = new TextEncoder();

async function mineNonce(
  salt: string,
  pubHex: string,
  k: number,
): Promise<string> {
  if (k === 0) return "0";

  let nonce = 0;
  const prefix = "0".repeat(k);

  while (true) {
    const nonceStr = String(nonce);
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(salt + pubHex + nonceStr),
    );

    if (bytesToHex(hashBuf).startsWith(prefix)) return nonceStr;

    nonce++;
    if (nonce % 500 === 0) {
      const msg: PowWorkerMessage = { type: "progress", attempts: nonce };
      self.postMessage(msg);
    }
  }
}

self.onmessage = async (e: MessageEvent<PowWorkerRequest>) => {
  const { salt, pubHex, k } = e.data;
  const nonce = await mineNonce(salt, pubHex, k);
  const msg: PowWorkerMessage = { type: "result", nonce };
  self.postMessage(msg);
};
