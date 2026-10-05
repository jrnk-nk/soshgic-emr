import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// Avoid pathological Rollup tree-shaking time for this prototype; all assets remain bundled locally.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { treeshake: false } },
});
