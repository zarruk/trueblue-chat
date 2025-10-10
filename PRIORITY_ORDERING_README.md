# 🎯 Sistema de Ordenamiento por Prioridad de Conversaciones

## 📋 Descripción

Este sistema garantiza que las conversaciones más urgentes **siempre** aparezcan primero en el dashboard, independientemente de cuándo fueron actualizadas.

## 🔄 Cambio Implementado

### **Antes:**
Las conversaciones se ordenaban por `updated_at` (fecha de última actualización):
- ❌ Conversaciones urgentes antiguas podían quedar fuera de las primeras 100
- ❌ Conversaciones cerradas recientes aparecían antes que pendientes antiguas

### **Después:**
Las conversaciones se ordenan por **prioridad** primero, luego por fecha:
- ✅ Todas las conversaciones urgentes aparecen primero (sin importar su antigüedad)
- ✅ Orden garantizado: pending → active → closed
- ✅ Dentro de cada prioridad, las más recientes primero

## 🎯 Orden de Prioridad

```
1. pending_human       🔥 MÁXIMA PRIORIDAD (cliente esperando agente)
2. pending_response    ⏳ Esperando respuesta del usuario
3. active_human        👤 Agente activo en conversación
4. active_ai          🤖 IA manejando conversación
5. closed             🔒 MÍNIMA PRIORIDAD (conversación cerrada)
```

## 📦 Cómo Funciona

### Carga Inicial (100 conversaciones)
```
Query RPC → ORDER BY prioridad ASC, updated_at DESC → LIMIT 100

Ejemplo de resultado:
├─ 15 pending_human (todas las que existan)
├─ 8 pending_response (todas las que existan)
├─ 45 active_human (las 45 más recientes)
├─ 32 active_ai (las 32 más recientes)
└─ 0 closed (no caben en las 100)
```

### Scroll Infinito
Cada vez que el usuario hace scroll, se cargan las siguientes 100 conversaciones **manteniendo el mismo orden de prioridad**.

## 🛠️ Instalación

### 1. Ejecutar SQL en Supabase

**Opción A: Manual**
1. Abre Supabase Dashboard → SQL Editor
2. Copia el contenido de `scripts/create-prioritized-conversations-function.sql`
3. Pégalo y ejecuta (RUN)

**Opción B: Script PowerShell**
```powershell
.\scripts\apply-prioritized-conversations-function.ps1
```

### 2. Verificación

La función debe aparecer en Supabase bajo:
- Database → Functions → `get_prioritized_conversations`

### 3. Probar en la App

1. Reinicia la aplicación
2. Ve al Dashboard
3. Las conversaciones urgentes deben aparecer primero

## 📊 Ejemplos

### Escenario 1: Muchas Urgentes
```
BD tiene:
- 150 pending_human
- 50 active_human
- 200 active_ai

Primera carga (100):
✅ Se traen las 100 pending_human más recientes
❌ No se traen active_human ni active_ai

Segunda carga (siguiente 100):
✅ Se traen las 50 pending_human restantes
✅ Se traen las 50 active_human más recientes
```

### Escenario 2: Pocas Urgentes
```
BD tiene:
- 5 pending_human
- 2 pending_response
- 100 active_human
- 500 active_ai

Primera carga (100):
✅ 5 pending_human (todas)
✅ 2 pending_response (todas)
✅ 93 active_human (las 93 más recientes)
```

### Escenario 3: Urgente Antigua
```
Conversación A:
- Status: pending_human
- Updated: hace 5 días
- ✅ SIEMPRE aparece en las primeras 100

Conversación B:
- Status: closed
- Updated: hace 1 hora
- ❌ Solo aparece si cabe después de las urgentes
```

## 🔍 Logs y Debugging

Buscar en consola:
```
🔍 fetchConversations: Ejecutando RPC get_prioritized_conversations...
📊 fetchConversations: Data length: 100
```

Si ves errores:
```
❌ Error: function get_prioritized_conversations does not exist
```
→ Falta ejecutar el SQL en Supabase

## 📝 Archivos Modificados

### Nuevos Archivos:
- `scripts/create-prioritized-conversations-function.sql` - Función SQL
- `scripts/apply-prioritized-conversations-function.ps1` - Script instalación
- `PRIORITY_ORDERING_README.md` - Esta documentación

### Archivos Modificados:
- `src/hooks/useConversations.tsx` - Usa RPC en lugar de query normal
  - `fetchConversations()` - Líneas 149-155
  - `loadMoreConversationsFromDB()` - Líneas 771-777

## 🎓 Detalles Técnicos

### Función SQL
```sql
CREATE OR REPLACE FUNCTION get_prioritized_conversations(
  p_client_id uuid,
  p_agent_id uuid,
  p_is_admin boolean,
  p_limit integer,
  p_offset integer
)
```

**Parámetros:**
- `p_client_id`: Filtrar por cliente (NULL = todos)
- `p_agent_id`: ID del agente (para filtros de rol)
- `p_is_admin`: Si es admin (ve todas las conversaciones)
- `p_limit`: Cantidad de resultados (100 por defecto)
- `p_offset`: Para paginación/scroll infinito

**Ordenamiento:**
```sql
ORDER BY
  CASE c.status
    WHEN 'pending_human' THEN 1
    WHEN 'pending_response' THEN 2
    WHEN 'active_human' THEN 3
    WHEN 'active_ai' THEN 4
    WHEN 'closed' THEN 5
    ELSE 6
  END ASC,
  c.updated_at DESC
```

## 🚀 Ventajas

✅ **Garantiza urgencias visibles** - Nunca se pierden conversaciones importantes
✅ **Performance optimizada** - Ordenamiento en BD (no en cliente)
✅ **Scroll infinito funcional** - Mantiene prioridad en cada lote
✅ **Compatible con filtros** - Respeta roles y clientes
✅ **Fácil de mantener** - Lógica centralizada en función SQL

## ⚠️ Notas Importantes

1. **La función debe ejecutarse en PRODUCCIÓN y STAGING** separadamente
2. **Los permisos ya están incluidos** en el SQL (GRANT EXECUTE)
3. **Si cambias la lógica de prioridad**, modifica el CASE en el SQL
4. **El RLS sigue aplicando** - la función respeta las políticas de seguridad

## 🔗 Referencias

- Commit: [Ver commit de este cambio]
- Issue relacionado: Ordenamiento por prioridad vs fecha
- Documentación Supabase RPC: https://supabase.com/docs/guides/database/functions

---

**Fecha de implementación:** 10 de octubre, 2024
**Autor:** Sistema de priorización de conversaciones

