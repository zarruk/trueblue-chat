# 🚨 INSTRUCCIONES URGENTES PARA HABILITAR REALTIME

## ❌ PROBLEMA IDENTIFICADO

**La sincronización en tiempo real NO funciona porque las tablas NO están habilitadas para RealTime en Supabase.**

### Síntomas actuales:
- ❌ Los mensajes NO aparecen automáticamente 
- ❌ Los cambios de estado NO se sincronizan
- ❌ Necesitas recargar la página para ver cambios
- ⚠️ Ves el mensaje: "RealTime no disponible - usando sincronización automática cada 5 segundos"

---

## ✅ SOLUCIÓN INMEDIATA (5 minutos)

### PASO 1: Ir a Supabase Dashboard
1. Ve a **https://supabase.com/dashboard/project/avkpygwhymnxotwqzknz**
2. Inicia sesión en tu cuenta
3. Ve a **"SQL Editor"** en el menú lateral izquierdo

### PASO 2: Ejecutar el Script SQL
**Copia y pega EXACTAMENTE este código en el SQL Editor:**

```sql
-- Habilitar RealTime para las tablas necesarias
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Verificar que las tablas están habilitadas
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN pubname IS NOT NULL THEN '✅ Habilitada'
        ELSE '❌ No habilitada'
    END as realtime_status
FROM pg_tables pt
LEFT JOIN pg_publication_tables ppt ON pt.schemaname = ppt.schemaname AND pt.tablename = ppt.tablename
WHERE pt.schemaname = 'public' 
    AND pt.tablename IN ('tb_conversations', 'tb_messages', 'profiles')
    AND (ppt.pubname = 'supabase_realtime' OR ppt.pubname IS NULL);
```

### PASO 3: Ejecutar y Verificar
1. **Haz clic en "RUN"** para ejecutar el script
2. **Deberías ver este resultado:**
   ```
   schemaname | tablename        | realtime_status
   -----------+------------------+------------------
   public     | tb_conversations | ✅ Habilitada
   public     | tb_messages      | ✅ Habilitada
   public     | profiles         | ✅ Habilitada
   ```

---

## 🎯 VERIFICAR QUE FUNCIONA

### PASO 4: Probar la Aplicación
1. **Espera 1-2 minutos** para que los cambios se propaguen
2. **Abre la aplicación** en el navegador
3. **Abre la consola** (F12 → Console)
4. **Busca estos logs:**
   ```
   ✅ [REALTIME] Suscripción a mensajes activa - ESPERANDO MENSAJES
   ✅ [REALTIME] Suscripción a conversaciones activa
   ```

### PASO 5: Probar Sincronización Real
1. **Abre 2 ventanas** de la aplicación
2. **Envía un mensaje** en una ventana
3. **Debería aparecer automáticamente** en la otra ventana
4. **Cambia el estado** de una conversación
5. **Debería actualizarse inmediatamente** en ambas ventanas

---

## 🔧 SI AÚN NO FUNCIONA

### Opción A: Verificar Permisos RLS
Si las tablas están habilitadas pero aún no funciona, ejecuta esto en SQL Editor:

```sql
-- Verificar políticas RLS que puedan bloquear RealTime
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('tb_conversations', 'tb_messages')
ORDER BY tablename, policyname;
```

### Opción B: Aplicar Fix de Políticas
Si hay problemas de permisos, ejecuta:

```sql
-- Fix de políticas para RealTime
DROP POLICY IF EXISTS "Users can view conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON tb_conversations;

CREATE POLICY "Agents can view assigned and pending conversations" ON tb_conversations
FOR SELECT USING (
    assigned_agent_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR status = 'pending_human'
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
```

---

## 🎉 RESULTADO ESPERADO

Después de aplicar la solución:

- ✅ **Los mensajes aparecen automáticamente** sin recargar
- ✅ **Los cambios de estado se ven al instante** 
- ✅ **Las asignaciones se sincronizan inmediatamente**
- ✅ **NO más mensaje de "RealTime no disponible"**
- ✅ **Sincronización perfecta entre ventanas**

---

## 📞 SOPORTE URGENTE

Si después de seguir estos pasos el problema persiste:

1. **Ejecuta esto en terminal:**
   ```bash
   cd /Users/salomonzarruk/Documents/Proyectos/trueblue-chat
   node scripts/verify-realtime.js
   ```

2. **Comparte el resultado** para diagnóstico adicional

3. **Verifica en consola del navegador** si aparecen errores específicos

---

**⏰ TIEMPO ESTIMADO: 5 minutos**  
**🎯 PRIORIDAD: CRÍTICA**  
**🚀 UNA VEZ HECHO, EL REALTIME FUNCIONARÁ PERFECTAMENTE**
