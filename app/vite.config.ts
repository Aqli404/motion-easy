import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // encoder (mediabunny) memang besar ~790k — wajar untuk codec H.264/AVC lokal
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/mediabunny") || id.includes("node_modules/mp4-muxer") || id.includes("node_modules/fflate")) return "encoder";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) return "react-vendor";
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
      },
    },
  },
});
