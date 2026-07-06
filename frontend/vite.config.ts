import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // bind 0.0.0.0 so Codespaces/remote port-forwarding can reach it
    port: 5173,
    strictPort: true,    // fail loudly instead of drifting to 5174
    proxy: { "/api": "http://localhost:8000" },
  },
});
