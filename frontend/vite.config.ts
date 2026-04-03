import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Single source of truth for domain types — no duplication.
      // Vite strips type-only imports at build time so there is no
      // runtime coupling to the backend.
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
});
