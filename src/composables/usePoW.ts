import { ref } from "vue";
import type {
  Challenge,
  PowWorkerMessage,
  PowWorkerRequest,
} from "../types/api";
import { API_BASE } from "../config";

export function usePoW() {
  const challenge = ref<Challenge>({ salt: "", k: 0, nonce: "", vip: false });
  const powWorking = ref(false);
  const powAttempts = ref(0);

  async function refreshChallenge(pubHex: string): Promise<void> {
    powWorking.value = true;
    powAttempts.value = 0;

    try {
      const res = await fetch(`${API_BASE}/v1/challenge`, {
        headers: { "X-SRN-PubKey": pubHex },
      });
      const ch = (await res.json()) as Omit<Challenge, "nonce">;

      const nonce = await solvePoW(ch.salt, pubHex, ch.k);
      challenge.value = { ...ch, nonce };
    } catch (e) {
      console.error("Challenge failed", e);
    } finally {
      powWorking.value = false;
    }
  }

  function solvePoW(salt: string, pubHex: string, k: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("../workers/pow.worker.ts", import.meta.url),
        { type: "module" },
      );

      const req: PowWorkerRequest = { salt, pubHex, k };
      worker.postMessage(req);

      worker.onmessage = (e: MessageEvent<PowWorkerMessage>) => {
        const msg = e.data;
        if (msg.type === "progress") {
          powAttempts.value = msg.attempts;
        } else {
          worker.terminate();
          resolve(msg.nonce);
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };
    });
  }

  return { challenge, powWorking, powAttempts, refreshChallenge };
}
