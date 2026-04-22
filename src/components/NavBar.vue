<script setup lang="ts">
import type { Identity, RelayStatus } from "../types/api";
import { API_BASE } from "../config";

defineProps<{
  identity: Identity | null;
  powWorking: boolean;
  powAttempts: number;
  relayStatus: RelayStatus | null;
}>();

defineEmits<{ "import-identity": [] }>();
</script>

<template>
  <nav class="navbar">
    <div class="logo">SRN CLOUDLESS</div>
    <div class="nav-links">
      <!-- Relay health + pubkey -->
      <span
        v-if="relayStatus"
        class="pubkey-chip"
        :class="relayStatus.healthy ? 'chip--online' : 'chip--offline'"
        :title="
          relayStatus.pubkey
            ? '中继公钥: ' + relayStatus.pubkey
            : '中继公钥未配置'
        "
      >
        <span class="chip-dot" />
        <span class="chip-label">中继</span>
        <span class="chip-key">
          {{
            relayStatus.pubkey ? relayStatus.pubkey.substring(0, 8) + "…" : "—"
          }}
        </span>
      </span>

      <!-- Client pubkey / PoW status -->
      <span
        v-if="powWorking"
        class="pubkey-chip chip--pow"
        :title="identity?.pubHex"
      >
        <span class="chip-dot chip-dot--spin" />
        <span class="chip-label">我</span>
        <span class="chip-key">
          {{ powAttempts > 0 ? powAttempts + " attempts" : "computing…" }}
        </span>
      </span>
      <span
        v-else-if="identity"
        class="pubkey-chip chip--me"
        :title="'我的公钥: ' + identity.pubHex"
      >
        <span class="chip-dot" />
        <span class="chip-label">我</span>
        <span class="chip-key">{{ identity.pubHex.substring(0, 8) }}…</span>
      </span>

      <button class="nav-link nav-btn" @click="$emit('import-identity')">
        导入密钥
      </button>
      <a
        :href="`${API_BASE}/ui`"
        target="_blank"
        rel="noopener"
        class="nav-link"
        >API DOCS</a
      >
      <a
        href="https://github.com/DeliYuxiang/SubtitleRelayNetwork"
        target="_blank"
        rel="noopener"
        class="nav-link nav-icon"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
      </a>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4rem;
}

.logo {
  font-weight: 600;
  letter-spacing: -0.025em;
  font-size: 1.25rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* ── Pubkey chip ──────────────────────────────────────────────── */
.pubkey-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: default;
  white-space: nowrap;
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chip-label {
  font-size: 0.65rem;
  opacity: 0.6;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.chip-key {
  font-weight: 500;
}

/* Online relay — green */
.chip--online {
  color: #166534;
  background: #dcfce7;
  border-color: #86efac;
}

.chip--online .chip-dot {
  background: #22c55e;
}

/* Offline relay — red */
.chip--offline {
  color: #991b1b;
  background: #fee2e2;
  border-color: #fca5a5;
}

.chip--offline .chip-dot {
  background: #ef4444;
}

/* My identity — blue */
.chip--me {
  color: #1e40af;
  background: #dbeafe;
  border-color: #93c5fd;
}

.chip--me .chip-dot {
  background: #3b82f6;
}

/* PoW in progress — amber */
.chip--pow {
  color: #92400e;
  background: #fef3c7;
  border-color: #fcd34d;
}

.chip--pow .chip-dot {
  background: #f59e0b;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }
}

/* ── Links ───────────────────────────────────────────────────── */
.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
}

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.nav-icon {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
