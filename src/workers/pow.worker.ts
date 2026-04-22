import { mineNonce } from "@srn/client";
import type { PowWorkerRequest, PowWorkerMessage } from "../types/api";

self.onmessage = async (e: MessageEvent<PowWorkerRequest>) => {
  const { salt, pubHex, k } = e.data;
  const nonce = await mineNonce(salt, pubHex, k, 5_000_000, (attempts) => {
    const msg: PowWorkerMessage = { type: "progress", attempts };
    self.postMessage(msg);
  });
  const msg: PowWorkerMessage = { type: "result", nonce };
  self.postMessage(msg);
};
