import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendor libraries into their own long-cached
        // chunks so app-code redeploys don't force users to re-download them, and to
        // parallelize the initial download. The PDF/dynamic-import path is left alone.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/"))
              return "react-vendor";
            if (id.includes("react-router")) return "router-vendor";
            if (id.includes("@radix-ui")) return "radix-vendor";
            if (id.includes("@supabase")) return "supabase-vendor";
            if (id.includes("@tanstack")) return "query-vendor";
            if (id.includes("lucide-react")) return "icons-vendor";
          }
        },
      },
    },
  },
}));
