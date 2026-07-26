import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/app/",
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
  },
  server: {
    // Vite serves the UI with HMR; `vercel dev` serves the /api functions on
    // 3000. Proxying keeps them same-origin in the browser so session cookies
    // are set and sent exactly as they will be in production.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: false,
      },
    },
  },
});
