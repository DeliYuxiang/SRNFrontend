import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [vue()],

  server: {
    proxy: {
      "/v1": {
      target: "https://srn-worker.delibill.workers.dev",
        changeOrigin: true,
      },
      "/favicon.svg": {
        target: "https://srn-worker.delibill.workers.dev",
        changeOrigin: true,
      },
      "/ui": {
        target: "https://srn-worker.delibill.workers.dev",
        changeOrigin: true,
      },
      "/doc": {
        target: "https://srn-worker.delibill.workers.dev",
        changeOrigin: true,
      },
    },
  },

  worker: {
    format: "es",
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
