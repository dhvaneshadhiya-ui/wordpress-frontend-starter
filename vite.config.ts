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
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000, // Increase to 2MB to suppress warnings for large data files
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Data files in their own chunk
          if (id.includes('/src/data/')) {
            return 'data';
          }
          // Vendor chunk
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor';
          }
          // UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'ui';
          }
          // React Query
          if (id.includes('node_modules/@tanstack')) {
            return 'query';
          }
        },
      },
    },
  },
}));
