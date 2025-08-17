# Solución para Problema de CORS con Webhook de n8n

## Problema Identificado

Cuando un agente humano enviaba un mensaje desde la interfaz en staging/producción, el webhook a n8n fallaba con el siguiente error:

```
Access to fetch at 'https://aztec.app.n8n.cloud/webhook/staging' from origin 'https://staging.trueblue.azteclab.co' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solución Implementada

Se implementó un proxy server-side usando las funciones de Vercel para evitar completamente el problema de CORS:

### 1. Función API de Vercel (`/api/n8n-webhook.ts`)
- Actúa como intermediario entre el frontend y n8n
- Recibe las peticiones del frontend y las reenvía a n8n desde el servidor
- Maneja las respuestas y errores de forma adecuada

### 2. Actualización del Servicio n8n (`/src/services/n8nService.ts`)
- Modificado para usar siempre la ruta `/api/n8n-webhook` en lugar de la URL directa
- Esto garantiza que todas las peticiones pasen por el proxy

### 3. Configuración de Desarrollo Local (`vite.config.ts`)
- Agregado proxy para desarrollo local que redirige `/api/n8n-webhook` al webhook correcto
- Detecta automáticamente el endpoint basándose en las variables de entorno

## Ventajas de esta Solución

1. **Sin CORS**: Las peticiones se hacen desde el servidor de Vercel, no desde el navegador
2. **Seguridad**: La URL del webhook de n8n no se expone directamente al cliente
3. **Flexibilidad**: Fácil cambiar URLs de webhooks sin modificar código del frontend
4. **Logs**: Mejor capacidad de debugging con logs del servidor

## Cómo Funciona

1. Frontend envía mensaje a `/api/n8n-webhook`
2. Función de Vercel recibe la petición
3. Función reenvía la petición a la URL real de n8n (desde variable de entorno)
4. n8n responde a la función de Vercel
5. Función devuelve la respuesta al frontend

## Variables de Entorno

La función usa la variable `VITE_N8N_WEBHOOK_URL` para determinar a dónde enviar los webhooks:
- Staging: `https://aztec.app.n8n.cloud/webhook/staging`
- Producción: `https://aztec.app.n8n.cloud/webhook/production`
- Local: `https://aztec.app.n8n.cloud/webhook/tb_local`

## Despliegue

Los cambios se despliegan automáticamente cuando se hace push a las ramas correspondientes:
- `staging` → Despliega a staging.trueblue.azteclab.co
- `main` → Despliega a producción

No se requiere configuración adicional en Vercel, las funciones API se detectan y despliegan automáticamente.
