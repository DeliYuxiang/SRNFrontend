<script setup lang="ts">
import type { ArchiveGroup, SRNEvent } from "../types/api";

const props = defineProps<{
  archive: ArchiveGroup;
  seasonCounts: Record<number, number | null>;
}>();

const emit = defineEmits<{
  downloadSingle: [item: SRNEvent];
  downloadLangPack: [season: number | null, lang: string, items: SRNEvent[]];
}>();

function epStatus(
  count: number,
  seasonNum: number | null,
): "complete" | "incomplete" | "unknown" {
  if (seasonNum == null) return "unknown";
  const total = props.seasonCounts[seasonNum];
  if (total == null) return "unknown";
  return count >= total ? "complete" : "incomplete";
}
</script>

<template>
  <div class="archive-card">
    <!-- Archive header -->
    <div class="archive-header">
      <span class="archive-title">
        {{ props.archive.group ?? "未知字幕组" }}
      </span>
      <template v-if="props.archive.source_uri">
        <span class="header-sep">·</span>
        <a
          :href="props.archive.source_uri"
          target="_blank"
          rel="noopener"
          class="source-link"
          :title="props.archive.source_uri"
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            style="flex-shrink: 0"
          >
            <path
              d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {{ props.archive.source_uri.replace(/^https?:\/\/([^/]+).*/, "$1") }}
        </a>
      </template>
      <div class="header-tags">
        <span v-if="props.archive.source_type" class="tag">
          {{ props.archive.source_type }}
        </span>
        <span
          v-if="props.archive.archive_md5"
          class="archive-md5-tag"
          :title="'archive: ' + props.archive.archive_md5"
        >
          {{ props.archive.archive_md5.substring(0, 10) }}…
        </span>
        <span class="pubkey-badge" :title="props.archive.pubkey">
          上传者&nbsp;{{ props.archive.pubkey.substring(0, 12) }}…
        </span>
      </div>
    </div>

    <!-- Season-language rows -->
    <div
      v-for="(season, sKey) in props.archive.seasons"
      :key="sKey"
      class="sl-row"
    >
      <div v-for="(langGroup, lang) in season.languages" :key="lang">
        <div class="sl-header">
          <span class="tag tag-season">
            S{{
              season.season != null
                ? String(season.season).padStart(2, "0")
                : "—"
            }}
          </span>
          <span class="tag tag-lang">{{ lang }}</span>
          <span
            class="ep-count"
            :class="{
              'ep-count--complete':
                epStatus(langGroup.items.length, season.season) === 'complete',
              'ep-count--incomplete':
                epStatus(langGroup.items.length, season.season) ===
                'incomplete',
            }"
          >
            {{ langGroup.items.length
            }}<template
              v-if="
                season.season != null &&
                props.seasonCounts[season.season] != null
              "
            >
              / {{ props.seasonCounts[season.season] }}</template
            >
            ep
          </span>
          <button
            class="pack-btn"
            @click="
              emit(
                'downloadLangPack',
                season.season,
                String(lang),
                langGroup.items,
              )
            "
          >
            季包下载
          </button>
        </div>
        <div class="ep-pills">
          <button
            v-for="item in langGroup.items"
            :key="item.id"
            class="ep-pill"
            @click="emit('downloadSingle', item)"
            :title="'下载 E' + String(item.episode_num ?? '?').padStart(2, '0')"
          >
            EP{{ String(item.episode_num ?? "?").padStart(2, "0") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.archive-card {
  background: white;
  border-radius: 1rem;
  border: 1px solid var(--border);
  overflow: hidden;
}

.archive-header {
  padding: 0.75rem 1.25rem;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.archive-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #0f172a;
  white-space: nowrap;
}

.header-sep {
  color: #cbd5e1;
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: white;
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 600;
  background: #2563eb;
  padding: 0.25rem 0.65rem;
  border-radius: 0.375rem;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.source-link:hover {
  background: #1d4ed8;
}

.header-tags {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.pubkey-badge {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.67rem;
  color: #7c3aed;
  background: #f5f3ff;
  padding: 0.18rem 0.45rem;
  border-radius: 0.25rem;
  border: 1px solid #ddd6fe;
  cursor: default;
  white-space: nowrap;
}

.archive-md5-tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.67rem;
  color: #0369a1;
  background: #f0f9ff;
  padding: 0.18rem 0.45rem;
  border-radius: 0.25rem;
  border: 1px solid #bae6fd;
  cursor: default;
  white-space: nowrap;
}

.sl-row {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border);
}

.sl-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
}

.tag-season {
  background: #fef9c3;
  color: #854d0e;
}

.tag-lang {
  background: #dbeafe;
  color: #1e40af;
}

.ep-count {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  color: #64748b;
  padding: 0.18rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid transparent;
}

.ep-count--complete {
  color: #166534;
  background: #dcfce7;
  border-color: #86efac;
}

.ep-count--incomplete {
  color: #991b1b;
  background: #fee2e2;
  border-color: #fca5a5;
}

.pack-btn {
  margin-left: auto;
  background: #f1f5f9;
  color: var(--text);
  font-size: 0.72rem;
  padding: 0.3rem 0.75rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
}

.ep-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ep-pill {
  background: #f8fafc;
  color: #334155;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.25rem 0.6rem;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.ep-pill:hover {
  background: #eff6ff;
  border-color: var(--primary);
  color: var(--primary);
}
</style>
