import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy para evitar CORS al llamar al webhook de n8n desde el navegador en desarrollo
      "/api/n8n-webhook": {
        target: process.env.VITE_N8N_WEBHOOK_URL || "https://aztec.app.n8n.cloud",
        changeOrigin: true,
        secure: true,
        // Reescribe /api/n8n-webhook -> /webhook/<endpoint> si se define VITE_N8N_WEBHOOK_URL
        rewrite: (path) => {
          const url = process.env.VITE_N8N_WEBHOOK_URL
          if (url && url.includes('/webhook/')) {
            const endpoint = url.split('/webhook/')[1]
            return path.replace(/^\/api\/n8n-webhook/, `/webhook/${endpoint}`)
          }
          return path
        },
      },
    },
  },
  plugins: [
    react(),
    // Deshabilitado el tagger de Lovable para evitar widget flotante en UI
    // mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
