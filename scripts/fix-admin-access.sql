-- =====================================================
-- CORRECCIÓN DE ACCESO PARA ADMINS
-- =====================================================

-- 1. Corregir políticas en profiles para que los admins puedan ver todos los agentes
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 2. Corregir políticas en tb_conversations
DROP POLICY IF EXISTS "Users can view conversations from their client" ON tb_conversations;
CREATE POLICY "Users can view conversations from their client" ON tb_conversations
    FOR SELECT USING (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert conversations for their client" ON tb_conversations;
CREATE POLICY "Users can insert conversations for their client" ON tb_conversations
    FOR INSERT WITH CHECK (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update conversations from their client" ON tb_conversations;
CREATE POLICY "Users can update conversations from their client" ON tb_conversations
    FOR UPDATE USING (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 3. Corregir políticas en tb_agents
DROP POLICY IF EXISTS "Users can view agents from their client" ON tb_agents;
CREATE POLICY "Users can view agents from their client" ON tb_agents
    FOR SELECT USING (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert agents for their client" ON tb_agents;
CREATE POLICY "Admins can insert agents for their client" ON tb_agents
    FOR INSERT WITH CHECK (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update agents from their client" ON tb_agents;
CREATE POLICY "Admins can update agents from their client" ON tb_agents
    FOR UPDATE USING (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 4. Corregir políticas en tb_message_templates
DROP POLICY IF EXISTS "Users can view templates from their client" ON tb_message_templates;
CREATE POLICY "Users can view templates from their client" ON tb_message_templates
    FOR SELECT USING (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert templates for their client" ON tb_message_templates;
CREATE POLICY "Users can insert templates for their client" ON tb_message_templates
    FOR INSERT WITH CHECK (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update templates from their client" ON tb_message_templates;
CREATE POLICY "Users can update templates from their client" ON tb_message_templates
    FOR UPDATE USING (
        client_id = get_current_user_client_id() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 5. Verificar que las políticas se aplicaron correctamente
SELECT 
  'Políticas corregidas en profiles' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT 
  'Políticas corregidas en tb_conversations' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'tb_conversations'
ORDER BY policyname;

SELECT 
  'Políticas corregidas en tb_agents' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'tb_agents'
ORDER BY policyname;

SELECT 
  'Políticas corregidas en tb_message_templates' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'tb_message_templates'
ORDER BY policyname;

-- =====================================================
-- FIN DE CORRECCIÓN
-- =====================================================
