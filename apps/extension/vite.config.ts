import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  envDir: ".", // .env in extension root (apps/extension)
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
