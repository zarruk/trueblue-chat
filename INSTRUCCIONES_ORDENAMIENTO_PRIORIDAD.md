# 🎯 Instrucciones: Implementar Ordenamiento por Prioridad

## ⚠️ IMPORTANTE: Orden de Implementación

**PRIMERO** ejecutar el SQL en Supabase
**DESPUÉS** aplicar los cambios en el código

Si lo haces al revés, la app dejará de funcionar (error 404).

---

## 📝 PASO 1: Ejecutar SQL en Supabase (REQUERIDO)

### Opción A: Dashboard de Supabase (Recomendado)

1. **Abrir Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
   ```

2. **Copiar el SQL completo:**
   - Abrir el archivo: `scripts/create-prioritized-conversations-function.sql`
   - Copiar TODO el contenido

3. **Pegar y Ejecutar:**
   - Pegar en el editor SQL de Supabase
   - Click en "Run" o Ctrl+Enter
   - Esperar confirmación: "Success. No rows returned"

4. **Verificar que se creó la función:**
   - Ir a: Database → Functions
   - Buscar: `get_prioritized_conversations`
   - Debe aparecer en la lista

### Opción B: Usando psql o cliente SQL

```sql
-- Conectar a tu BD de Supabase y ejecutar:
\i scripts/create-prioritized-conversations-function.sql
```

---

## 📝 PASO 2: Aplicar Cambios en el Código

Una vez confirmado que la función existe en Supabase:

1. **Ejecutar el siguiente comando en tu terminal:**

```bash
# Cambia a modo agente y pide aplicar estos cambios
```

2. **Los cambios a aplicar son:**

### En `src/hooks/useConversations.tsx` - función `fetchConversations`:

**Reemplazar líneas 125-154 con:**
```typescript
// 🎯 NUEVO: Usar RPC para traer conversaciones ya ordenadas por prioridad
const role = p?.role as string | undefined
const profileId = p?.id as string | undefined

if (role !== 'admin') {
  if (profileId) {
    console.log('🔒 Non-admin user, filtering conversations')
  } else {
    console.log('🔒 No profile ID, showing only pending')
  }
} else {
  console.log('👑 Admin user, showing all conversations')
}

console.log('🔍 fetchConversations: Ejecutando RPC get_prioritized_conversations...')
console.log('🔍 fetchConversations: Parámetros:', {
  p_client_id: clientId || null,
  p_agent_id: profileId || null,
  p_is_admin: role === 'admin',
  p_limit: poolSize,
  p_offset: 0
})

// ✅ Usar función RPC para ordenamiento por prioridad en BD
const { data, error } = await (supabase.rpc as any)('get_prioritized_conversations', {
  p_client_id: clientId || null,
  p_agent_id: profileId || null,
  p_is_admin: role === 'admin',
  p_limit: poolSize,
  p_offset: 0
})
```

### En `src/hooks/useConversations.tsx` - función `loadMoreConversationsFromDB`:

**Reemplazar líneas 757-781 con:**
```typescript
// 🎯 NUEVO: Usar RPC con offset para mantener ordenamiento por prioridad
const role = p?.role as string | undefined
const profileId = p?.id as string | undefined

console.log('🗄️ loadMoreConversationsFromDB: Ejecutando RPC get_prioritized_conversations...')
console.log('🗄️ loadMoreConversationsFromDB: Parámetros:', {
  p_client_id: clientId || null,
  p_agent_id: profileId || null,
  p_is_admin: role === 'admin',
  p_limit: poolSize,
  p_offset: poolOffset + poolSize
})

const { data, error } = await (supabase.rpc as any)('get_prioritized_conversations', {
  p_client_id: clientId || null,
  p_agent_id: profileId || null,
  p_is_admin: role === 'admin',
  p_limit: poolSize,
  p_offset: poolOffset + poolSize
})

console.log('🗄️ loadMoreConversationsFromDB: Query ejecutada. Data length:', data?.length, 'Error:', error)
```

---

## 📝 PASO 3: Verificar

1. **Recargar la aplicación**
2. **Abrir consola del navegador**
3. **Buscar estos logs:**
   ```
   🔍 fetchConversations: Ejecutando RPC get_prioritized_conversations...
   📊 fetchConversations: Data length: 100
   ```

4. **Verificar orden de conversaciones:**
   - Las `pending_human` deben aparecer primero
   - Luego `pending_response`
   - Luego `active_human`
   - Luego `active_ai`
   - Al final `closed`

---

## ❌ Troubleshooting

### Error: "404 - get_prioritized_conversations not found"
**Causa:** No ejecutaste el PASO 1 (SQL en Supabase)
**Solución:** Vuelve al PASO 1 y ejecuta el SQL

### Error: "permission denied for function"
**Causa:** Falta grant de permisos
**Solución:** Asegúrate de ejecutar las últimas 2 líneas del SQL:
```sql
GRANT EXECUTE ON FUNCTION get_prioritized_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_prioritized_conversations TO anon;
```

### La app se queda cargando infinitamente
**Causa:** Ejecutaste el código antes del SQL
**Solución:** 
1. Revertir cambios en el código (git checkout)
2. Ejecutar SQL primero
3. Aplicar cambios en código después

### Las conversaciones no aparecen en orden de prioridad
**Causa:** Posible cache
**Solución:**
1. Hard refresh (Ctrl+Shift+R)
2. Borrar caché del navegador
3. Verificar que la función RPC se ejecutó correctamente

---

## 🎓 Entender el Cambio

### Antes:
```
Query: SELECT * FROM tb_conversations 
       ORDER BY updated_at DESC 
       LIMIT 100
```
→ Trae las 100 más recientes (sin importar urgencia)

### Después:
```
RPC: get_prioritized_conversations(100)
     ORDER BY (priority CASE) ASC, updated_at DESC
     LIMIT 100
```
→ Trae las 100 priorizadas (urgentes primero, luego más recientes)

---

## 📚 Archivos Relacionados

- `scripts/create-prioritized-conversations-function.sql` - Función SQL
- `scripts/apply-prioritized-conversations-function.ps1` - Helper script
- `PRIORITY_ORDERING_README.md` - Documentación completa
- `src/hooks/useConversations.tsx` - Hook que usa la función

---

**Fecha:** 10 de octubre, 2024
**Estado actual:** Función SQL lista, código revertido (pendiente aplicar PASO 2)







