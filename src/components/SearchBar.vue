<script setup lang="ts">
import type { TMDBResult } from "../types/api";
import AutocompleteDropdown from "./AutocompleteDropdown.vue";

const props = defineProps<{
  modelValue: string;
  tmdbEnabled: boolean;
  powWorking: boolean;
  suggestions: TMDBResult[];
}>();

const emit = defineEmits<{
  "update:modelValue": [v: string];
  "update:tmdbEnabled": [v: boolean];
  input: [];
  enter: [];
  select: [s: TMDBResult];
}>();
</script>

<template>
  <div class="search-input-wrapper">
    <div class="search-container">
      <!-- TMDB Toggle -->
      <div
        class="tmdb-toggle"
        :class="{ 'tmdb-active': props.tmdbEnabled }"
        @click="emit('update:tmdbEnabled', !props.tmdbEnabled)"
      >
        <div class="toggle-track">
          <div class="toggle-thumb"></div>
        </div>
        <span class="tmdb-label">TMDB</span>
      </div>

      <!-- Input + autocomplete -->
      <div class="input-wrapper">
        <input
          type="text"
          :value="props.modelValue"
          @input="
            emit(
              'update:modelValue',
              ($event.target as HTMLInputElement).value,
            );
            emit('input');
          "
          @keyup.enter="emit('enter')"
          placeholder="输入电影/剧集名称，或直达 TMDB ID..."
        />
        <AutocompleteDropdown
          :suggestions="props.suggestions"
          @select="emit('select', $event)"
        />
      </div>

      <button
        @click="emit('enter')"
        :disabled="props.powWorking"
        :style="props.powWorking ? 'opacity:0.5;cursor:not-allowed' : ''"
      >
        {{ props.powWorking ? "验证中..." : "搜索" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-input-wrapper {
  margin-bottom: 2rem;
}

.search-container {
  background: white;
  padding: 0.75rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  display: flex;
  gap: 0.5rem;
  border: 1px solid var(--border);
}

.input-wrapper {
  flex: 1;
  position: relative;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  outline: none;
  font-size: 1rem;
  font-family: inherit;
}

button {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

/* TMDB Toggle */
.tmdb-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  border-right: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
}

.toggle-track {
  width: 32px;
  height: 18px;
  background: #cbd5e1;
  border-radius: 9px;
  position: relative;
  transition: background 0.2s;
}

.toggle-thumb {
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.tmdb-active .toggle-track {
  background: #10b981;
}

.tmdb-active .toggle-thumb {
  transform: translateX(14px);
}

.tmdb-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}
</style>
