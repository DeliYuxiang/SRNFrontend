import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],

  server: {
    proxy: {
      "/v1": {
        target: "https://srn.majiyabakunai.moe",
        changeOrigin: true,
      },
      "/favicon.svg": {
        target: "http://localhost:8787",
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
