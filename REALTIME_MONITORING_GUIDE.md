# Guía del Sistema de Monitoreo Realtime

## ¿Qué es este sistema?

Este sistema detecta automáticamente cuando los mensajes de agentes se guardan en Supabase pero no se envían al cliente por WhatsApp (porque falla el evento de Realtime). Cuando esto pasa, el sistema los reintenta automáticamente sin que el usuario se dé cuenta.

## ¿Cómo funciona?

### Flujo Normal (Cuando todo funciona bien):
1. Agente envía mensaje desde la app ✅
2. Mensaje se guarda en `tb_messages` ✅
3. Supabase genera evento de Realtime ✅
4. N8N recibe el evento ✅
5. N8N envía mensaje por WhatsApp al cliente ✅

### Flujo con Problema (Cuando falla Realtime):
1. Agente envía mensaje desde la app ✅
2. Mensaje se guarda en `tb_messages` ✅
3. Supabase **NO** genera evento de Realtime ❌
4. N8N nunca recibe el evento ❌
5. Cliente nunca recibe el mensaje ❌

### Flujo con Recuperación Automática:
1. Sistema de monitoreo detecta mensaje huérfano ✅
2. Sistema reintenta generando evento de Realtime manualmente ✅
3. N8N recibe el evento ✅
4. Cliente recibe el mensaje ✅

## Componentes del Sistema

### 1. Base de Datos (Supabase)

#### Tabla `system_alerts`
Almacena alertas cuando se detectan problemas:
```sql
-- Ver alertas activas
SELECT * FROM system_alerts 
WHERE resolved = FALSE 
ORDER BY created_at DESC;
```

#### Funciones SQL
- `detect_orphaned_messages()` - Encuentra mensajes huérfanos
- `retry_failed_messages()` - Reintenta mensajes fallidos
- `monitor_realtime_health()` - Función principal de monitoreo
- `get_monitoring_stats()` - Estadísticas del sistema

### 2. Automatización (N8N)

#### Workflow `realtime-health-monitor.json`
- Se ejecuta cada 5 minutos
- Llama a la función `monitor_realtime_health()`
- Envía alertas por Slack y email si hay problemas
- Notifica cuando se recuperan mensajes exitosamente

## Cómo usar el sistema

### Verificar estado del sistema
```sql
-- Ejecutar monitoreo manualmente
SELECT monitor_realtime_health();

-- Ver estadísticas
SELECT * FROM get_monitoring_stats();

-- Ver mensajes huérfanos actuales
SELECT * FROM detect_orphaned_messages();
```

### Ver alertas
```sql
-- Alertas no resueltas
SELECT * FROM system_alerts 
WHERE resolved = FALSE 
ORDER BY created_at DESC;

-- Alertas críticas
SELECT * FROM system_alerts 
WHERE severity = 'CRITICAL' 
ORDER BY created_at DESC;
```

### Resolver alertas
```sql
-- Marcar alerta como resuelta
UPDATE system_alerts 
SET resolved = TRUE, resolved_at = NOW() 
WHERE id = 'uuid-de-la-alerta';
```

## Configuración de Alertas

### Variables de Entorno Requeridas en N8N:
- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY` - Clave anónima de Supabase
- `SLACK_WEBHOOK_URL` - Webhook de Slack para alertas
- `ALERT_EMAIL` - Email para recibir alertas

### Niveles de Severidad:
- **LOW** - 1 mensaje huérfano
- **MEDIUM** - 2-4 mensajes huérfanos
- **HIGH** - 5-9 mensajes huérfanos
- **CRITICAL** - 10+ mensajes huérfanos

## Monitoreo y Mantenimiento

### Verificar que el sistema funciona:
1. Ejecutar `SELECT monitor_realtime_health();` en Supabase
2. Verificar que N8N ejecuta el workflow cada 5 minutos
3. Revisar logs de N8N para confirmar ejecuciones

### Si hay problemas:
1. **Verificar conexión Supabase-N8N**: Revisar logs de N8N
2. **Verificar funciones SQL**: Ejecutar manualmente en Supabase
3. **Verificar alertas**: Revisar tabla `system_alerts`
4. **Verificar mensajes huérfanos**: Ejecutar `detect_orphaned_messages()`

### Mantenimiento regular:
- Revisar alertas semanalmente
- Limpiar alertas resueltas antiguas (más de 30 días)
- Verificar estadísticas de recuperación

## Solución de Problemas

### Problema: No se ejecuta el monitoreo
**Solución**: 
1. Verificar que N8N esté ejecutando el workflow
2. Revisar logs de N8N
3. Verificar variables de entorno

### Problema: Alertas no llegan
**Solución**:
1. Verificar configuración de Slack webhook
2. Verificar configuración de email
3. Revisar logs de N8N

### Problema: Mensajes no se recuperan
**Solución**:
1. Ejecutar `retry_failed_messages()` manualmente
2. Verificar que existe la tabla de Realtime del día actual
3. Revisar logs de Supabase

### Problema: Muchas alertas falsas
**Solución**:
1. Ajustar el intervalo de tiempo en `detect_orphaned_messages()`
2. Revisar si hay problemas sistemáticos con Realtime
3. Considerar aumentar el umbral de alertas

## Comandos Útiles

```sql
-- Monitoreo completo
SELECT monitor_realtime_health();

-- Solo detectar mensajes huérfanos
SELECT * FROM detect_orphaned_messages();

-- Solo reintentar mensajes
SELECT retry_failed_messages();

-- Estadísticas del día
SELECT * FROM get_monitoring_stats();

-- Limpiar alertas antiguas
DELETE FROM system_alerts 
WHERE created_at < NOW() - INTERVAL '30 days' 
AND resolved = TRUE;
```

## Notas Importantes

- El sistema solo monitorea mensajes de agentes (`sender_role = 'agent'`)
- Los reintentos son automáticos y silenciosos
- El usuario nunca se entera de los fallos técnicos
- Las alertas solo van al equipo técnico
- El sistema funciona independientemente de la aplicación React

## Contacto

Si tienes problemas con el sistema de monitoreo, contacta al equipo técnico con:
1. Logs de N8N
2. Resultado de `get_monitoring_stats()`
3. Descripción del problema observado


