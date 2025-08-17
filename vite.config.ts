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
      "/n8n-webhook": {
        target: "https://aztec.app.n8n.cloud",
        changeOrigin: true,
        secure: true,
        // Reescribe /n8n-webhook -> /webhook/tb_local (endpoint correcto)
        rewrite: (path) => path.replace(/^\/n8n-webhook/, "/webhook/tb_local"),
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
