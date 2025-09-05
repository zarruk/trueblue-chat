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
        // Siempre apuntar al host de n8n en dev; el endpoint se define por rewrite
        target: "https://aztec.app.n8n.cloud",
        changeOrigin: true,
        secure: true,
        // Reescribe /api/n8n-webhook -> /webhook/<endpoint>
        // endpoint = tail de VITE_N8N_WEBHOOK_URL o 'tb_local' por defecto
        rewrite: (path) => {
          const configured = process.env.VITE_N8N_WEBHOOK_URL
          const endpoint = configured && configured.includes('/webhook/')
            ? configured.split('/webhook/')[1]
            : 'tb_local'
          return path.replace(/^\/api\/n8n-webhook/, `/webhook/${endpoint}`)
        },
      },
      // Proxy para outbound messages en desarrollo local
      "/api/n8n-outbound": {
        target: "https://aztec.app.n8n.cloud",
        changeOrigin: true,
        secure: true,
        // Reescribe /api/n8n-outbound -> /webhook/<outbound-endpoint>
        rewrite: (path) => {
          const configured = process.env.VITE_N8N_OUTBOUND_WEBHOOK_URL
          const endpoint = configured && configured.includes('/webhook/')
            ? configured.split('/webhook/')[1]
            : 'a1908f33-9836-4db3-9379-ab75d665f29b'
          return path.replace(/^\/api\/n8n-outbound/, `/webhook/${endpoint}`)
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
