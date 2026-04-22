<script setup lang="ts">
import type { ArchiveGroup, SRNEvent } from "../types/api";
import ArchiveCard from "./ArchiveCard.vue";
import LoadingCard from "./LoadingCard.vue";

defineProps<{
  loading: boolean;
  archives: ArchiveGroup[];
  seasonCounts: Record<number, number | null>;
  searchInput: string;
}>();

const emit = defineEmits<{
  downloadSingle: [item: SRNEvent];
  downloadLangPack: [season: number | null, lang: string, items: SRNEvent[]];
}>();
</script>

<template>
  <div v-if="loading" class="results-grid">
    <LoadingCard v-for="i in 3" :key="i" />
  </div>

  <div v-else class="results-grid">
    <ArchiveCard
      v-for="archive in archives"
      :key="archive.key"
      :archive="archive"
      :seasonCounts="seasonCounts"
      @downloadSingle="emit('downloadSingle', $event)"
      @downloadLangPack="
        (season, lang, items) => emit('downloadLangPack', season, lang, items)
      "
    />

    <div v-if="!archives.length && searchInput" class="empty-state">
      暂无索引结果
    </div>
  </div>
</template>

<style scoped>
.results-grid {
  display: grid;
  gap: 1.25rem;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 4rem 0;
}
</style>
