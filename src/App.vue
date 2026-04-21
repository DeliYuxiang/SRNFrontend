<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

const appVersion = __APP_VERSION__;
import NavBar from "./components/NavBar.vue";
import SearchBar from "./components/SearchBar.vue";
import ResultsGrid from "./components/ResultsGrid.vue";
import { useIdentity } from "./composables/useIdentity";
import { usePoW } from "./composables/usePoW";
import { useSRNClient } from "./composables/useSRNClient";
import type {
  SRNEvent,
  TMDBResult,
  ArchiveGroup,
  SeasonGroup,
  LangGroup,
  RelayStatus,
} from "./types/api";
import { API_BASE } from "./config";
import { bytesToHex } from "./utils/hex";

// ── State ────────────────────────────────────────────────────────────────────
const searchInput = ref("");
const tmdbEnabled = ref(false);
const loading = ref(false);
const results = ref<SRNEvent[]>([]);
const suggestions = ref<TMDBResult[]>([]);
const seasonCounts = ref<Record<number, number | null>>({});
const currentTitle = ref("");
const totalEvents = ref(0);
const uniqueTitles = ref(0);
const uniqueEpisodes = ref(0);
const relayStatus = ref<RelayStatus | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Import identity modal ─────────────────────────────────────────────────────
const showImportModal = ref(false);
const importPrivHex = ref("");
const importPubHex = ref("");
const importError = ref("");

// ── Composables ──────────────────────────────────────────────────────────────
const { identity, privKey, init: initIdentity } = useIdentity();
const { challenge, powWorking, powAttempts, refreshChallenge } = usePoW();
const { searchEvents, searchTMDB, getSeasonInfo, downloadContent } =
  useSRNClient(identity, privKey, challenge, refreshChallenge);

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await initIdentity();

  // Fetch relay info + identity in parallel with PoW challenge
  const [, relayRes, identityRes] = await Promise.allSettled([
    refreshChallenge(identity.value!.pubHex),
    fetch(`${API_BASE}/v1/relay`),
    fetch(`${API_BASE}/v1/identity`),
  ]);

  // Relay → stats counters
  if (relayRes.status === "fulfilled" && relayRes.value.ok) {
    const data = (await relayRes.value.json()) as {
      totalEvents?: number;
      uniqueTitles?: number;
      uniqueEpisodes?: number;
    };
    totalEvents.value = data.totalEvents ?? 0;
    uniqueTitles.value = data.uniqueTitles ?? 0;
    uniqueEpisodes.value = data.uniqueEpisodes ?? 0;
  }

  // Identity → relay pubkey + health status + worker version
  const healthy = relayRes.status === "fulfilled" && relayRes.value.ok;
  let pubkey = "";
  let version = "";
  if (identityRes.status === "fulfilled" && identityRes.value.ok) {
    const data = (await identityRes.value.json()) as {
      pubkey?: string;
      version?: string;
    };
    pubkey = data.pubkey ?? "";
    version = data.version ?? "";
  }
  relayStatus.value = { pubkey, healthy, version };
});

// ── Search ───────────────────────────────────────────────────────────────────
function onInput() {
  if (powWorking.value) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!searchInput.value) {
    suggestions.value = [];
    return;
  }
  debounceTimer = setTimeout(fetchSuggestions, 1000);
}

async function fetchSuggestions() {
  try {
    suggestions.value = await searchTMDB(searchInput.value, tmdbEnabled.value);
  } catch (e) {
    console.error("fetchSuggestions:", e);
  }
}

async function selectSuggestion(s: TMDBResult) {
  currentTitle.value = s.name ?? s.title ?? "";
  searchInput.value = currentTitle.value;
  suggestions.value = [];
  await fetchEvents(s.id);
}

async function onEnter() {
  if (powWorking.value) return;
  const q = searchInput.value.trim();
  if (!q) return;

  if (/^\d+$/.test(q)) {
    await fetchEvents(parseInt(q, 10));
  } else if (suggestions.value.length > 0) {
    await selectSuggestion(suggestions.value[0]);
  } else {
    await fetchSuggestions();
    if (suggestions.value.length > 0) {
      await selectSuggestion(suggestions.value[0]);
    }
  }
}

async function fetchEvents(id: number) {
  loading.value = true;
  suggestions.value = [];
  seasonCounts.value = {};
  try {
    results.value = await searchEvents({ tmdb: String(id) });

    const seasons = [
      ...new Set(
        results.value.map((e) => e.season_num).filter((s) => s != null),
      ),
    ] as number[];
    if (seasons.length > 0) fetchSeasonCounts(id, seasons);
  } catch (e) {
    console.error("fetchEvents:", e);
  } finally {
    loading.value = false;
  }
}

async function fetchSeasonCounts(tmdbId: number, seasons: number[]) {
  const counts: Record<number, number | null> = {};
  await Promise.all(
    seasons.map(async (s) => {
      counts[s] = await getSeasonInfo(tmdbId, s).catch(() => null);
    }),
  );
  seasonCounts.value = counts;
}

// ── Download ─────────────────────────────────────────────────────────────────
async function downloadSingle(item: SRNEvent) {
  const res = await downloadContent(item.id);
  if (!res.ok) {
    alert("下载失败");
    return;
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = item.filename ?? `SRN_${item.id}.ass`;
  a.click();
}

async function downloadLangPack(
  _season: number | null,
  _lang: string,
  items: SRNEvent[],
) {
  for (const item of items) {
    await downloadSingle(item);
  }
}

// ── Grouping ─────────────────────────────────────────────────────────────────
// Group by archive_md5 (or event id for singles) → season_num → language → sorted episodes
const groupedResults = computed<ArchiveGroup[]>(() => {
  const archives: Record<string, ArchiveGroup> = {};

  for (const item of results.value) {
    const aKey = item.archive_md5 ?? item.id;
    if (!archives[aKey]) {
      const groupTag = item.tags.find((t) => t[0] === "group");
      archives[aKey] = {
        key: aKey,
        archive_md5: item.archive_md5,
        source_uri: item.source_uri,
        source_type: item.source_type,
        pubkey: item.pubkey,
        tmdb_id: item.tmdb_id,
        group: groupTag?.[1] ?? null,
        seasons: {},
      };
    }

    // JS integer keys sort ascending automatically — free season sort
    const sKey = item.season_num != null ? item.season_num : "movie";
    const arc = archives[aKey];
    if (!arc.seasons[sKey]) {
      arc.seasons[sKey] = {
        season: item.season_num,
        languages: {},
      } as SeasonGroup;
    }

    const lang = item.language ?? "unknown";
    const season = arc.seasons[sKey];
    if (!season.languages[lang]) {
      season.languages[lang] = { items: [] } as LangGroup;
    }
    season.languages[lang].items.push(item);
  }

  // Sort episodes within each language group by episode_num ascending
  for (const arc of Object.values(archives)) {
    for (const season of Object.values(arc.seasons)) {
      for (const lg of Object.values(season.languages)) {
        lg.items.sort((x, y) => (x.episode_num ?? 0) - (y.episode_num ?? 0));
      }
    }
  }

  return Object.values(archives);
});

// ── Import identity ───────────────────────────────────────────────────────────
async function doImportIdentity() {
  importError.value = "";
  let privHex = importPrivHex.value.trim().toLowerCase();
  const pubHex = importPubHex.value.trim().toLowerCase();

  // Some formats store seed+pubkey as 64 bytes — take only the first 32 (seed)
  if (privHex.length === 128) privHex = privHex.slice(0, 64);

  if (!/^[0-9a-f]{64}$/.test(privHex)) {
    importError.value = "私钥需为64位十六进制（32字节种子）";
    return;
  }
  if (!/^[0-9a-f]{64}$/.test(pubHex)) {
    importError.value = "公钥需为64位十六进制（32字节）";
    return;
  }

  try {
    // Wrap raw 32-byte seed in Ed25519 PKCS8 envelope
    const pkcs8Hex = "302e020100300506032b657004220420" + privHex;
    const pkcs8Bytes = new Uint8Array(
      pkcs8Hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );
    // Verify the key is valid before saving
    await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Bytes.buffer as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["sign"],
    );

    localStorage.setItem(
      "srn_identity_v3",
      JSON.stringify({
        pubHex,
        privHex: bytesToHex(pkcs8Bytes.buffer as ArrayBuffer),
      }),
    );

    showImportModal.value = false;
    importPrivHex.value = "";
    importPubHex.value = "";

    await initIdentity();
    await refreshChallenge(identity.value!.pubHex);
  } catch (_) {
    importError.value = "密钥格式无效，请检查输入";
  }
}
</script>

<template>
  <div class="container">
    <NavBar
      :identity="identity"
      :powWorking="powWorking"
      :powAttempts="powAttempts"
      :relayStatus="relayStatus"
      @import-identity="showImportModal = true"
    />

    <!-- Import identity modal -->
    <div
      v-if="showImportModal"
      class="modal-overlay"
      @click.self="showImportModal = false"
    >
      <div class="modal">
        <h2 class="modal-title">导入密钥对</h2>
        <label class="modal-label">
          私钥（raw hex，32字节）
          <input
            v-model="importPrivHex"
            class="modal-input"
            placeholder="64位或128位十六进制"
            spellcheck="false"
            autocomplete="off"
          />
        </label>
        <label class="modal-label">
          公钥（raw hex，32字节）
          <input
            v-model="importPubHex"
            class="modal-input"
            placeholder="64位十六进制"
            spellcheck="false"
            autocomplete="off"
          />
        </label>
        <p v-if="importError" class="modal-error">{{ importError }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showImportModal = false">
            取消
          </button>
          <button class="btn-confirm" @click="doImportIdentity">导入</button>
        </div>
      </div>
    </div>

    <header class="hero">
      <h1>探索索引</h1>
      <div class="hero-stats">
        <span class="hero-stat">
          <span class="hero-stat-num">{{ totalEvents.toLocaleString() }}</span>
          <span class="hero-stat-label">条字幕记录</span>
        </span>
        <span class="hero-stat-sep">·</span>
        <span class="hero-stat">
          <span class="hero-stat-num">{{ uniqueTitles.toLocaleString() }}</span>
          <span class="hero-stat-label">部作品</span>
        </span>
        <span class="hero-stat-sep">·</span>
        <span class="hero-stat">
          <span class="hero-stat-num">{{ uniqueEpisodes.toLocaleString() }}</span>
          <span class="hero-stat-label">集/集合</span>
        </span>
      </div>
    </header>

    <main>
      <SearchBar
        v-model="searchInput"
        v-model:tmdbEnabled="tmdbEnabled"
        :powWorking="powWorking"
        :suggestions="suggestions"
        @input="onInput"
        @enter="onEnter"
        @select="selectSuggestion"
      />

      <ResultsGrid
        :loading="loading"
        :archives="groupedResults"
        :seasonCounts="seasonCounts"
        :searchInput="searchInput"
        @downloadSingle="downloadSingle"
        @downloadLangPack="downloadLangPack"
      />
    </main>

    <footer>
      SRN CLOUDLESS · 去中心化字幕索引网络
      <span class="footer-versions">
        <span class="version-tag">前端 v{{ appVersion }}</span>
        <span class="version-sep">·</span>
        <span class="version-tag">中继 {{ relayStatus?.version ? 'v' + relayStatus.version : '—' }}</span>
      </span>
    </footer>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  margin-bottom: 4rem;
}

.hero h1 {
  font-size: 3rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #0f172a;
}

.hero-stats {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 1.125rem;
}

.hero-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
}

.hero-stat-num {
  font-weight: 600;
  color: #0f172a;
}

.hero-stat-sep {
  opacity: 0.4;
}

/* ── Import modal ────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  width: 420px;
  max-width: calc(100vw - 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.modal-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #475569;
}

.modal-input {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  color: #0f172a;
}

.modal-input:focus {
  border-color: #3b82f6;
}

.modal-error {
  font-size: 0.8rem;
  color: #dc2626;
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-cancel,
.btn-confirm {
  padding: 0.45rem 1.1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.btn-confirm {
  background: #3b82f6;
  color: #fff;
  font-weight: 500;
}

.btn-confirm:hover {
  background: #2563eb;
}

/* ── Footer versions ─────────────────────────────────────────── */
footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.footer-versions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  color: #94a3b8;
}

.version-sep {
  opacity: 0.5;
}
</style>
