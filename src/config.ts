// API base URL. Set VITE_API_BASE at build time to target a specific backend.
// Leave empty to use relative paths — works with the Vite dev proxy and
// Cloudflare Pages _redirects without any code changes.
export const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? "").replace(/\/+$/, "");
