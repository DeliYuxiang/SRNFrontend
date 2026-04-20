<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
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
} from "./types/api";

// ── State ────────────────────────────────────────────────────────────────────
const searchInput = ref("");
const tmdbEnabled = ref(false);
const loading = ref(false);
const results = ref<SRNEvent[]>([]);
const suggestions = ref<TMDBResult[]>([]);
const seasonCounts = ref<Record<number, number | null>>({});
const currentTitle = ref("");
const totalEvents = ref(0);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Composables ──────────────────────────────────────────────────────────────
const { identity, privKey, init: initIdentity } = useIdentity();
const { challenge, powWorking, powAttempts, refreshChallenge } = usePoW();
const { srnFetch, srnFetchDownload } = useSRNClient(
  identity,
  privKey,
  challenge,
  refreshChallenge,
);

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await initIdentity();
  await refreshChallenge(identity.value!.pubHex);

  // Fetch total event count for the hero subtitle
  try {
    const res = await fetch("/v1/health");
    const data = (await res.json()) as { message?: string };
    const match = data.message?.match(/(\d+)/);
    if (match) totalEvents.value = parseInt(match[1], 10);
  } catch (_) {
    // Non-critical — leave at 0
  }
});

// ── Search ───────────────────────────────────────────────────────────────────
function onInput() {
  if (powWorking.value) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!searchInput.value) {
    suggestions.value = [];
    return;
  }
  debounceTimer = setTimeout(fetchSuggestions, 300);
}

async function fetchSuggestions() {
  try {
    const fresh = tmdbEnabled.value ? "&fresh=1" : "";
    const url = `/v1/tmdb/search?q=${encodeURIComponent(searchInput.value)}${fresh}`;
    const res = await srnFetch(url);
    const data = (await res.json()) as { results?: TMDBResult[] };
    suggestions.value = data.results ?? [];
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
    const res = await srnFetch(`/v1/events?tmdb=${id}`);
    const data = (await res.json()) as { events?: SRNEvent[] };
    results.value = data.events ?? [];

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
      try {
        const res = await srnFetch(
          `/v1/tmdb/season?tmdb_id=${tmdbId}&season=${s}`,
        );
        const data = (await res.json()) as { episode_count?: number };
        counts[s] = data.episode_count ?? null;
      } catch (_) {
        counts[s] = null;
      }
    }),
  );
  seasonCounts.value = counts;
}

// ── Download ─────────────────────────────────────────────────────────────────
async function downloadSingle(item: SRNEvent) {
  const res = await srnFetchDownload(`/v1/events/${item.id}/content`);
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
      archives[aKey] = {
        key: aKey,
        archive_md5: item.archive_md5,
        source_uri: item.source_uri,
        source_type: item.source_type,
        pubkey: item.pubkey,
        tmdb_id: item.tmdb_id,
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
        lg.items.sort(
          (x, y) => (x.episode_num ?? 0) - (y.episode_num ?? 0),
        );
      }
    }
  }

  return Object.values(archives);
});
</script>

<template>
  <div class="container">
    <NavBar
      :identity="identity"
      :powWorking="powWorking"
      :powAttempts="powAttempts"
    />

    <header class="hero">
      <h1>探索索引</h1>
      <p>基于 {{ totalEvents }} 条全球字幕元数据记录</p>
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
        :currentTitle="currentTitle"
        :seasonCounts="seasonCounts"
        :searchInput="searchInput"
        @downloadSingle="downloadSingle"
        @downloadLangPack="downloadLangPack"
      />
    </main>

    <footer>SRN CLOUDLESS · 去中心化字幕索引网络</footer>
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

.hero p {
  color: #64748b;
  font-size: 1.125rem;
}
</style>
