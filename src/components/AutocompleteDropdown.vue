<script setup lang="ts">
import type { TMDBResult } from "../types/api";

defineProps<{
  suggestions: TMDBResult[];
}>();

const emit = defineEmits<{
  select: [s: TMDBResult];
}>();
</script>

<template>
  <div class="suggestions" v-if="suggestions.length">
    <div
      v-for="s in suggestions"
      :key="s.id"
      class="suggestion-item"
      @click="emit('select', s)"
    >
      <img
        :src="
          s.poster_path ? 'https://image.tmdb.org/t/p/w92' + s.poster_path : ''
        "
        class="suggestion-poster"
        alt=""
      />
      <div class="suggestion-info">
        <h4>{{ s.name || s.title }}</h4>
        <p>
          {{ (s.first_air_date || s.release_date || "").substring(0, 4) }} ·
          {{ s.media_type === "tv" ? "剧集" : "电影" }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.suggestions {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  margin-top: 0.5rem;
  overflow: hidden;
  position: absolute;
  width: 100%;
  z-index: 10;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.suggestion-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.suggestion-item:hover {
  background: #f1f5f9;
}

.suggestion-poster {
  width: 40px;
  height: 60px;
  background: #e2e8f0;
  border-radius: 4px;
  object-fit: cover;
}

.suggestion-info h4 {
  font-size: 0.9rem;
  margin-bottom: 0.1rem;
}

.suggestion-info p {
  font-size: 0.75rem;
  color: #64748b;
}
</style>
