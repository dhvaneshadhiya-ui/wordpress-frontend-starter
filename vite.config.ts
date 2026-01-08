import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // PWA disabled temporarily to fix build loop
    // VitePWA({...})
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    // Bundle all problematic packages into SSR build
    noExternal: [
      'react-helmet-async',
      'sonner',
      /^@radix-ui\/.*/, // Match ALL Radix packages
      'lucide-react',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'cmdk',
      'vaul',
      'embla-carousel-react',
      'recharts',
    ]
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Force unique file names on every build for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('/src/data/')) {
            return 'data';
          }
          // Combine React and Radix UI in same chunk to fix loading order
          if (
            id.includes('node_modules/react-dom') || 
            id.includes('node_modules/react/') || 
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@radix-ui')
          ) {
            return 'vendor';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'query';
          }
        },
      },
    },
  },
}));
