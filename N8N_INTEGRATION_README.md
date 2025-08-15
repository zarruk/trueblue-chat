# Integración con N8N Webhook

## Descripción

Esta implementación permite que cuando un agente humano envíe un mensaje desde el frontend, se conecte automáticamente con el webhook de n8n que routeriza por el canal correspondiente y responde.

## Webhook URL

```
https://aztec.app.n8n.cloud/webhook/feb40c09-7947-4523-a263-9647125a03ec
```

## Funcionalidad Implementada

### 1. Servicio N8N (`src/services/n8nService.ts`)

- **Clase N8nService**: Maneja la comunicación con el webhook de n8n
- **Detección automática de canales**: Identifica automáticamente si la conversación es de WhatsApp, Telegram, SMS o web
- **Manejo de errores**: Gestiona errores de conexión sin bloquear el flujo principal

### 2. Integración en el Hook de Conversaciones

- **Envío automático**: Cuando un agente envía un mensaje, se envía automáticamente al webhook de n8n
- **Payload estructurado**: Incluye toda la información necesaria para el routing
- **No bloqueante**: Si falla n8n, el mensaje se guarda localmente pero se registra el error

### 3. Componente de Debug

- **N8nWebhookDebug**: Permite probar la conectividad con n8n
- **Logs en tiempo real**: Muestra el historial de envíos al webhook
- **Pruebas manuales**: Botón para enviar mensajes de prueba

## Estructura del Payload

```typescript
interface N8nWebhookPayload {
  conversationId: string        // ID único de la conversación
  message: string              // Contenido del mensaje
  channel: string              // Canal detectado automáticamente
  senderId: string             // ID del usuario que envía el mensaje
  chatId: string               // ID del chat en el canal específico
}
```

### Ejemplo de Payload

```json
{
  "conversationId": "1a24014a-f1d8-4674-930b-07a3dabae70c",
  "message": "hola n8n",
  "channel": "telegram",
  "senderId": "5ebfc3d8-9796-4015-99ae-22cf74c222d3",
  "chatId": "644983775"
}
```

## Detección Automática de Canales

### Lógica de Detección

1. **WhatsApp**: Si `phone_number` contiene `@c.us`
2. **SMS**: Si `phone_number` existe pero no es WhatsApp
3. **Telegram**: Si `username` comienza con `@`
4. **Web**: Por defecto

### Prioridad de Detección

1. Campo `channel` en la base de datos (si existe)
2. Análisis de `phone_number`
3. Análisis de `username`
4. Fallback a `web`

## Base de Datos

### Campo Agregado

Se agregó el campo `channel` a la tabla `tb_conversations`:

```sql
ALTER TABLE tb_conversations 
ADD COLUMN channel TEXT DEFAULT 'web';

CREATE INDEX idx_conversations_channel ON tb_conversations(channel);
```

### Script de Migración

El archivo `src/utils/addChannelField.sql` contiene la migración completa.

## Flujo de Funcionamiento

### 1. Agente Envía Mensaje

```
Usuario hace clic en "Enviar" → 
Mensaje se guarda en Supabase → 
Se actualiza estado de conversación → 
Se envía payload a n8n webhook → 
n8n procesa y responde por canal correspondiente
```

### 2. Integración con N8N

- **Entrada**: Payload JSON con información de la conversación
- **Procesamiento**: n8n determina el canal y enruta el mensaje
- **Respuesta**: n8n responde al usuario por el canal correspondiente

## Configuración

### Variables de Entorno

No se requieren variables adicionales. El webhook URL está hardcodeado en el servicio.

### Dependencias

- `fetch` API (nativa del navegador)
- `sonner` para notificaciones (ya incluido)

## Uso

### 1. Envío Automático

Los mensajes se envían automáticamente cuando un agente responde. No se requiere configuración adicional.

### 2. Pruebas Manuales

1. Ir a la página de Debug (`/debug`)
2. Usar el componente "Debug Webhook N8N"
3. Hacer clic en "Probar Webhook"
4. Revisar los logs para verificar la conectividad

### 3. Monitoreo

- **Consola del navegador**: Logs detallados de cada envío
- **Componente de debug**: Historial visual de envíos
- **Base de datos**: Campo `channel` para tracking

## Manejo de Errores

### Estrategia de Fallback

1. **Mensaje se guarda localmente** (prioridad máxima)
2. **Se intenta enviar a n8n** (secundario)
3. **Si falla n8n, se registra el error** pero no se bloquea la funcionalidad
4. **Usuario recibe notificación de éxito** (mensaje guardado)

### Logs de Error

- Errores de red
- Errores de respuesta del webhook
- Errores de parsing de datos
- Timeouts de conexión

## Próximos Pasos

### Mejoras Sugeridas

1. **Reintentos automáticos**: Implementar reintentos en caso de fallo
2. **Cola de mensajes**: Buffer para mensajes que fallan
3. **Métricas**: Dashboard de éxito/fallo de envíos
4. **Configuración dinámica**: Permitir cambiar webhook URL desde la UI
5. **Webhooks múltiples**: Soporte para diferentes entornos (dev, staging, prod)

### Integración con Otros Canales

- **Discord**: Soporte para servidores de Discord
- **Slack**: Integración con canales de Slack
- **Email**: Respuestas por correo electrónico
- **SMS**: Integración con proveedores de SMS

## Troubleshooting

### Problemas Comunes

1. **Webhook no responde**
   - Verificar URL del webhook
   - Revisar logs de n8n
   - Probar conectividad desde el componente de debug

2. **Mensajes no se envían**
   - Verificar consola del navegador
   - Revisar permisos de CORS
   - Verificar que el agente esté autenticado

3. **Canal detectado incorrectamente**
   - Revisar datos de la conversación
   - Verificar campo `channel` en la base de datos
   - Ajustar lógica de detección si es necesario

### Debug

- Usar el componente `N8nWebhookDebug`
- Revisar logs en la consola del navegador
- Verificar respuestas del webhook en n8n
- Monitorear campo `channel` en la base de datos

## Seguridad

### Consideraciones

- **Webhook URL**: Está hardcodeada (considerar hacerla configurable)
- **Autenticación**: n8n debe validar la autenticidad de las peticiones
- **Rate Limiting**: Implementar en n8n si es necesario
- **Validación de datos**: n8n debe validar el payload recibido

### Recomendaciones

1. Implementar autenticación en el webhook de n8n
2. Validar el origen de las peticiones
3. Implementar rate limiting para prevenir spam
4. Logging de todas las peticiones para auditoría
