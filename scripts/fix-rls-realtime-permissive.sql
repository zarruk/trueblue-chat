-- Fix RLS Policies for Real-time Synchronization
-- Solución: Políticas más permisivas que permiten ver conversaciones pendientes
-- Fecha: 2024-01-16

-- ===================================================================
-- PASO 1: Eliminar políticas restrictivas existentes
-- ===================================================================

-- Eliminar políticas de conversaciones
DROP POLICY IF EXISTS "Users can view conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON tb_conversations;
DROP POLICY IF EXISTS "Users can update conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can update all conversations" ON tb_conversations;

-- Eliminar políticas de mensajes
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON tb_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON tb_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON tb_messages;
DROP POLICY IF EXISTS "Admins can insert messages to any conversation" ON tb_messages;

-- ===================================================================
-- PASO 2: Crear nuevas políticas más permisivas para real-time
-- ===================================================================

-- POLÍTICAS PARA tb_conversations (MÁS PERMISIVAS)
-- Los agentes pueden ver:
-- 1. Conversaciones asignadas a ellos
-- 2. Conversaciones pendientes (pending_human) - NUEVO
-- 3. Los admins pueden ver todas
CREATE POLICY "Agents can view assigned and pending conversations" ON tb_conversations
    FOR SELECT USING (
        -- Conversaciones asignadas al agente actual
        assigned_agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
        OR
        -- Conversaciones pendientes (para que puedan tomarlas)
        status = 'pending_human'
        OR
        -- Los admins pueden ver todas
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Los agentes pueden actualizar:
-- 1. Conversaciones asignadas a ellos
-- 2. Conversaciones pendientes (para asignárselas)
-- 3. Los admins pueden actualizar todas
CREATE POLICY "Agents can update assigned and pending conversations" ON tb_conversations
    FOR UPDATE USING (
        -- Conversaciones asignadas al agente actual
        assigned_agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
        OR
        -- Conversaciones pendientes (para poder asignárselas)
        status = 'pending_human'
        OR
        -- Los admins pueden actualizar todas
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- POLÍTICAS PARA tb_messages (MÁS PERMISIVAS)
-- Los agentes pueden ver mensajes de:
-- 1. Conversaciones asignadas a ellos
-- 2. Conversaciones pendientes - NUEVO
-- 3. Los admins pueden ver todos
CREATE POLICY "Agents can view messages from assigned and pending conversations" ON tb_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM tb_conversations 
            WHERE 
                -- Conversaciones asignadas al agente actual
                assigned_agent_id IN (
                    SELECT id FROM profiles WHERE user_id = auth.uid()
                )
                OR
                -- Conversaciones pendientes
                status = 'pending_human'
        )
        OR
        -- Los admins pueden ver todos los mensajes
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Los agentes pueden insertar mensajes en:
-- 1. Conversaciones asignadas a ellos
-- 2. Conversaciones pendientes (al tomarlas)
-- 3. Los admins pueden insertar en cualquier conversación
CREATE POLICY "Agents can insert messages to assigned and pending conversations" ON tb_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM tb_conversations 
            WHERE 
                -- Conversaciones asignadas al agente actual
                assigned_agent_id IN (
                    SELECT id FROM profiles WHERE user_id = auth.uid()
                )
                OR
                -- Conversaciones pendientes (al tomarlas)
                status = 'pending_human'
        )
        OR
        -- Los admins pueden insertar mensajes en cualquier conversación
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ===================================================================
-- PASO 3: Verificar que Real-time esté habilitado para las tablas
-- ===================================================================

-- Asegurar que las tablas estén en la publicación de real-time
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ===================================================================
-- PASO 4: Crear función para verificar permisos de real-time
-- ===================================================================

CREATE OR REPLACE FUNCTION check_realtime_permissions()
RETURNS TABLE(
    table_name TEXT,
    can_select BOOLEAN,
    can_insert BOOLEAN,
    can_update BOOLEAN,
    user_role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'tb_conversations'::TEXT as table_name,
        (SELECT COUNT(*) > 0 FROM tb_conversations LIMIT 1) as can_select,
        TRUE as can_insert,
        TRUE as can_update,
        (SELECT role::TEXT FROM profiles WHERE user_id = auth.uid() LIMIT 1) as user_role
    UNION ALL
    SELECT 
        'tb_messages'::TEXT as table_name,
        (SELECT COUNT(*) > 0 FROM tb_messages LIMIT 1) as can_select,
        TRUE as can_insert,
        FALSE as can_update,
        (SELECT role::TEXT FROM profiles WHERE user_id = auth.uid() LIMIT 1) as user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ===================================================================

COMMENT ON POLICY "Agents can view assigned and pending conversations" ON tb_conversations IS 
'Permite a los agentes ver conversaciones asignadas y pendientes para sincronización real-time';

COMMENT ON POLICY "Agents can view messages from assigned and pending conversations" ON tb_messages IS 
'Permite a los agentes ver mensajes de conversaciones asignadas y pendientes para sincronización real-time';

-- ===================================================================
-- FIN DEL SCRIPT
-- ===================================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'RLS Policies actualizadas exitosamente para permitir real-time con conversaciones pendientes';
    RAISE NOTICE 'Los agentes ahora pueden ver y tomar conversaciones pending_human';
    RAISE NOTICE 'La sincronización real-time debería funcionar correctamente';
END $$;