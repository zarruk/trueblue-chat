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
        target: "https://aztec.app.n8n.cloud",
        changeOrigin: true,
        secure: true,
        // Reescribe /api/n8n-webhook -> /webhook/tb_local (o el endpoint correspondiente)
        rewrite: (path) => {
          const endpoint = process.env.VITE_N8N_WEBHOOK_URL?.split('/webhook/')[1] || 'tb_local'
          return path.replace(/^\/api\/n8n-webhook/, `/webhook/${endpoint}`)
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
