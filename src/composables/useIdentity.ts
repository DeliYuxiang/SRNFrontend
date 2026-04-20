import { ref } from "vue";
import type { Identity } from "../types/api";
import { bytesToHex } from "../utils/hex";

const SRN_ID_STORE = "srn_identity_v3";

async function loadOrCreateIdentity(): Promise<Identity> {
  const raw = localStorage.getItem(SRN_ID_STORE);
  if (raw) {
    try {
      const id = JSON.parse(raw) as Identity;
      if (id.pubHex && id.privHex) return id;
    } catch (_) {
      // corrupt entry — regenerate
    }
  }

  const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
  ]);
  const pubBuf = await crypto.subtle.exportKey("raw", kp.publicKey);
  const privBuf = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
  const id: Identity = {
    pubHex: bytesToHex(pubBuf),
    privHex: bytesToHex(privBuf),
  };
  localStorage.setItem(SRN_ID_STORE, JSON.stringify(id));
  return id;
}

export async function importPrivKey(privHex: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(
    privHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
  );
  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

export function useIdentity() {
  const identity = ref<Identity | null>(null);
  const privKey = ref<CryptoKey | null>(null);

  async function init() {
    identity.value = await loadOrCreateIdentity();
    privKey.value = await importPrivKey(identity.value.privHex);
  }

  return { identity, privKey, init };
}
