-- APLICAR FIX PARA REAL-TIME SYNCHRONIZATION
-- Ejecutar este script en el SQL Editor de Supabase
-- ===================================================================

-- PASO 1: Eliminar políticas restrictivas
DROP POLICY IF EXISTS "Users can view conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON tb_conversations;
DROP POLICY IF EXISTS "Users can update conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can update all conversations" ON tb_conversations;

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON tb_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON tb_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON tb_messages;
DROP POLICY IF EXISTS "Admins can insert messages to any conversation" ON tb_messages;

-- PASO 2: Crear políticas permisivas para real-time
CREATE POLICY "Agents can view assigned and pending conversations" ON tb_conversations
    FOR SELECT USING (
        assigned_agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
        OR
        status = 'pending_human'
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Agents can update assigned and pending conversations" ON tb_conversations
    FOR UPDATE USING (
        assigned_agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
        OR
        status = 'pending_human'
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Agents can view messages from assigned and pending conversations" ON tb_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM tb_conversations 
            WHERE 
                assigned_agent_id IN (
                    SELECT id FROM profiles WHERE user_id = auth.uid()
                )
                OR
                status = 'pending_human'
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Agents can insert messages to assigned and pending conversations" ON tb_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM tb_conversations 
            WHERE 
                assigned_agent_id IN (
                    SELECT id FROM profiles WHERE user_id = auth.uid()
                )
                OR
                status = 'pending_human'
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- PASO 3: Verificar real-time
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;