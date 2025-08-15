# 🔧 Solución al Problema del Webhook de n8n

## 📋 **Problema Identificado**

El webhook de n8n no está recibiendo la información correctamente debido a varios errores en el código:

1. **Error en el `chatId`**: Se estaba enviando el `conversationId` en lugar del `user_id` de la conversación
2. **Error en el `senderId`**: Se estaba enviando el `user_id` de la conversación en lugar del ID del agente
3. **Falta la columna `channel`**: La columna `channel` no existe en la tabla `tb_conversations`

## 🚀 **Soluciones Implementadas**

### **1. Corrección del Código del Servicio n8n**

Se corrigió el archivo `src/services/n8nService.ts`:

```typescript
// ANTES (INCORRECTO):
prepareWebhookPayload(
  conversationId: string,
  conversation: any,
  messageContent: string,
  agentEmail: string, // ❌ Incorrecto
  _agentName: string
): N8nWebhookPayload {
  // ... código incorrecto ...
  const chatId = conversationId // ❌ Incorrecto
  const senderId = conversation.user_id // ❌ Incorrecto
}

// DESPUÉS (CORRECTO):
prepareWebhookPayload(
  conversationId: string,
  conversation: any,
  messageContent: string,
  agentId: string, // ✅ Correcto
  agentName: string
): N8nWebhookPayload {
  // ... código correcto ...
  const chatId = conversation.user_id // ✅ Correcto: ID del usuario en el canal
  const senderId = agentId // ✅ Correcto: ID del agente que envía
}
```

### **2. Corrección del Hook useConversations**

Se corrigió el archivo `src/hooks/useConversations.tsx`:

```typescript
// ANTES (INCORRECTO):
const webhookPayload = n8nService.prepareWebhookPayload(
  conversationId,
  conversationData,
  content,
  profile.email, // ❌ Incorrecto: debería ser profile.id
  profile.name
)

// DESPUÉS (CORRECTO):
const webhookPayload = n8nService.prepareWebhookPayload(
  conversationId,
  conversationData,
  content,
  profile.id, // ✅ Correcto: ID del agente
  profile.name
)
```

### **3. Agregada Columna `channel` a la Base de Datos**

Se creó el archivo `src/utils/addChannelField.sql` para agregar la columna `channel`:

```sql
-- Agregar columna channel si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tb_conversations' 
        AND column_name = 'channel'
    ) THEN
        ALTER TABLE tb_conversations ADD COLUMN channel TEXT DEFAULT 'web';
        RAISE NOTICE 'Columna channel agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna channel ya existe';
    END IF;
END $$;

-- Crear índice y actualizar datos existentes
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON tb_conversations(channel);

UPDATE tb_conversations 
SET channel = CASE 
  WHEN phone_number IS NOT NULL THEN 'whatsapp'
  WHEN username LIKE '@%' THEN 'telegram'
  ELSE 'web'
END
WHERE channel = 'web' OR channel IS NULL;
```

### **4. Mejorado el Logging y Debugging**

- Se agregó logging detallado en `n8nService.ts`
- Se creó el componente `N8nWebhookDebug` para probar el webhook
- Se agregó verificación automática de la estructura de la BD

## 🔧 **Pasos para Aplicar la Solución**

### **Paso 1: Ejecutar la Migración SQL**

**Opción A: Usando el Script de PowerShell**
```powershell
# Desde el directorio raíz del proyecto
.\scripts\add-channel-column.ps1
```

**Opción B: Manualmente en Supabase**
1. Ir al SQL Editor de Supabase
2. Copiar y pegar el contenido de `src/utils/addChannelField.sql`
3. Ejecutar el script

### **Paso 2: Verificar la Estructura**

La aplicación verificará automáticamente la estructura al cargar, pero puedes verificar manualmente:

```sql
-- Verificar que la columna existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tb_conversations' 
AND column_name = 'channel';

-- Verificar datos existentes
SELECT id, user_id, username, phone_number, channel 
FROM tb_conversations 
LIMIT 5;
```

### **Paso 3: Probar el Webhook**

1. Ir a la página de Debug (`/debug`)
2. Usar el componente "Debug del Webhook de n8n"
3. Probar con datos de ejemplo
4. Verificar en la consola del navegador los logs

## 🧪 **Testing del Webhook**

### **Datos de Prueba Recomendados**

```json
{
  "conversationId": "test-conversation-123",
  "message": "Este es un mensaje de prueba para verificar el webhook de n8n",
  "channel": "telegram",
  "senderId": "test-agent-456",
  "chatId": "test-user-789"
}
```

### **Verificación en n8n**

1. Abrir el workflow de n8n
2. Verificar que el webhook recibe el payload
3. Revisar los logs del nodo webhook
4. Confirmar que el mensaje se procesa correctamente

## 🔍 **Debugging y Logs**

### **Logs del Frontend**

Los logs aparecerán en la consola del navegador:

```
🔍 senderRole es "agent", procediendo con webhook...
🔍 Buscando conversación en BD: [conversationId]
✅ Conversación encontrada: [conversationData]
🔍 Preparando payload para n8n: [payload]
📤 Payload preparado para n8n: [webhookPayload]
📤 Enviando mensaje a n8n webhook...
🚀 Enviando mensaje a n8n webhook: [details]
📡 Respuesta del servidor n8n: [response]
✅ Mensaje enviado exitosamente a n8n
```

### **Logs del Servicio n8n**

```typescript
// Logs detallados en n8nService.ts
console.log('🚀 Enviando mensaje a n8n webhook:', {
  url: this.webhookUrl,
  payload: { ... }
})

console.log('📡 Respuesta del servidor n8n:', {
  status: response.status,
  statusText: response.statusText,
  headers: Object.fromEntries(response.headers.entries())
})
```

## 🚨 **Posibles Problemas y Soluciones**

### **Problema 1: Columna `channel` no existe**
**Síntoma**: Error "column 'channel' does not exist"
**Solución**: Ejecutar la migración SQL

### **Problema 2: Webhook no responde**
**Síntoma**: Timeout o error de conexión
**Solución**: 
- Verificar la URL del webhook en `n8nService.ts`
- Confirmar que n8n esté funcionando
- Verificar CORS y configuración de red

### **Problema 3: Payload incorrecto**
**Síntoma**: Error 400 o payload malformado
**Solución**: 
- Verificar la estructura del payload en los logs
- Confirmar que todos los campos requeridos estén presentes
- Verificar tipos de datos (strings, no undefined)

### **Problema 4: Permisos de base de datos**
**Síntoma**: Error de permisos al acceder a `tb_conversations`
**Solución**: 
- Verificar políticas RLS en Supabase
- Confirmar que el usuario autenticado tenga permisos

## 📊 **Verificación de la Solución**

### **Checklist de Verificación**

- [ ] Columna `channel` existe en `tb_conversations`
- [ ] Conversaciones existentes tienen valores de `channel` apropiados
- [ ] El webhook de n8n recibe el payload correcto
- [ ] Los logs muestran el flujo completo sin errores
- [ ] El mensaje se envía correctamente desde el frontend
- [ ] n8n procesa y enruta el mensaje al canal correspondiente

### **Comandos de Verificación**

```sql
-- Verificar estructura
\d tb_conversations

-- Verificar datos
SELECT COUNT(*) as total_conversations,
       COUNT(channel) as conversations_with_channel,
       string_agg(DISTINCT channel, ', ') as channels_found
FROM tb_conversations;

-- Verificar conversaciones recientes
SELECT id, user_id, username, phone_number, channel, updated_at
FROM tb_conversations 
ORDER BY updated_at DESC 
LIMIT 10;
```

## 🎯 **Resultado Esperado**

Después de aplicar todas las correcciones:

1. **El webhook de n8n recibirá correctamente**:
   - `conversationId`: ID único de la conversación
   - `message`: Contenido del mensaje del agente
   - `channel`: Canal de origen (telegram, whatsapp, web)
   - `senderId`: ID del agente que envía el mensaje
   - `chatId`: ID del usuario en el canal de origen

2. **Los logs mostrarán el flujo completo** sin errores
3. **n8n podrá procesar y enrutar** los mensajes correctamente
4. **La funcionalidad de envío de mensajes** funcionará como esperado

## 📞 **Soporte Adicional**

Si persisten los problemas:

1. Revisar los logs completos en la consola del navegador
2. Verificar la configuración de n8n y el webhook
3. Probar el webhook directamente con herramientas como Postman
4. Revisar la documentación de n8n sobre webhooks
5. Verificar la conectividad de red y CORS

---

**🎉 ¡Con estas correcciones, el webhook de n8n debería funcionar correctamente!**
