<template>
  <div class="archive-card loading-shimmer" style="height: 140px"></div>
</template>

<style scoped>
.archive-card {
  background: white;
  border-radius: 1rem;
  border: 1px solid var(--border);
  overflow: hidden;
}

.loading-shimmer {
  background: linear-gradient(
    90deg,
    #f1f5f9 25%,
    #e2e8f0 50%,
    #f1f5f9 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
