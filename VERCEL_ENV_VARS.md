# Variables de Entorno Requeridas en Vercel

## Importante: Variables para Funciones API

Las funciones API de Vercel NO tienen acceso a las variables que comienzan con `VITE_`. Debes configurar las siguientes variables adicionales en tu proyecto de Vercel:

### Para Staging

```
N8N_WEBHOOK_URL=https://aztec.app.n8n.cloud/webhook/staging
```

### Para Production

```
N8N_WEBHOOK_URL=https://aztec.app.n8n.cloud/webhook/production
```

## Cómo Configurar en Vercel

1. Ve a tu proyecto en el dashboard de Vercel
2. Navega a Settings → Environment Variables
3. Agrega la variable `N8N_WEBHOOK_URL` con el valor correspondiente
4. Asegúrate de seleccionar el entorno correcto (Preview/Production)
5. Haz un redeploy para que tome los cambios

## Variables Existentes (para el Frontend)

Estas ya deberían estar configuradas y funcionando:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_N8N_WEBHOOK_URL`
- `VITE_APP_URL`
- Etc.

**Nota**: Las variables `VITE_*` son para el build del frontend. Las funciones API necesitan variables sin el prefijo `VITE_`.
