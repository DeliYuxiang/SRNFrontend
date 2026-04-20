<script setup lang="ts">
import type { Identity } from "../types/api";

defineProps<{
  identity: Identity | null;
  powWorking: boolean;
  powAttempts: number;
}>();
</script>

<template>
  <nav class="navbar">
    <div class="logo">SRN CLOUDLESS</div>
    <div class="nav-links">
      <span v-if="powWorking" class="pow-status">
        证明工作量{{ powAttempts > 0 ? " · " + powAttempts : " ..." }}
      </span>
      <span
        v-else-if="identity"
        class="identity-status"
        :title="identity.pubHex"
      >
        ● {{ identity.pubHex.substring(0, 8) }}…
      </span>
      <a href="/ui" class="nav-link">API DOCS</a>
      <a
        href="https://github.com/DeliYuxiang/SubtitleRelayNetwork"
        target="_blank"
        rel="noopener"
        class="nav-link nav-icon"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
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
  gap: 1.5rem;
  align-items: center;
}

.pow-status {
  font-size: 0.72rem;
  color: #64748b;
  font-family: "JetBrains Mono", monospace;
}

.identity-status {
  font-size: 0.72rem;
  color: #4ade80;
  font-family: "JetBrains Mono", monospace;
  cursor: default;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
}

.nav-icon {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
