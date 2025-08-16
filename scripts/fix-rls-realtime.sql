-- SCRIPT PARA ARREGLAR RLS Y REALTIME EN TRUEBLUE CHAT
-- Ejecutar este script COMPLETO en Supabase Dashboard > SQL Editor

-- 1. VERIFICAR ESTADO ACTUAL DE RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY tablename;

-- 2. VERIFICAR POLÍTICAS EXISTENTES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY tablename, policyname;

-- 3. VERIFICAR ESTADO DE REALTIME
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

-- 4. HABILITAR REALTIME (SI NO ESTÁ HABILITADO)
-- Comentar estas líneas si ya están habilitadas según el resultado anterior
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 5. CREAR/ACTUALIZAR POLÍTICAS PARA ANON Y AUTHENTICATED
-- Estas políticas permiten operaciones básicas necesarias para el chat

-- Políticas para tb_messages (MÁS PERMISIVAS)
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON tb_messages;
DROP POLICY IF EXISTS "Admins can insert messages to any conversation" ON tb_messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON tb_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON tb_messages;

-- Política más permisiva para INSERT de mensajes
CREATE POLICY "Allow message insert for authenticated users" ON tb_messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política más permisiva para SELECT de mensajes
CREATE POLICY "Allow message select for authenticated users" ON tb_messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para UPDATE de mensajes
CREATE POLICY "Allow message update for authenticated users" ON tb_messages
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para tb_conversations (MÁS PERMISIVAS)
DROP POLICY IF EXISTS "Users can view conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON tb_conversations;
DROP POLICY IF EXISTS "Users can update conversations they're assigned to" ON tb_conversations;
DROP POLICY IF EXISTS "Admins can update all conversations" ON tb_conversations;

-- Política más permisiva para SELECT de conversaciones
CREATE POLICY "Allow conversation select for authenticated users" ON tb_conversations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política más permisiva para UPDATE de conversaciones
CREATE POLICY "Allow conversation update for authenticated users" ON tb_conversations
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para INSERT de conversaciones
CREATE POLICY "Allow conversation insert for authenticated users" ON tb_conversations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para profiles (MÁS PERMISIVAS)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Política más permisiva para SELECT de profiles
CREATE POLICY "Allow profile select for authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política más permisiva para UPDATE de profiles
CREATE POLICY "Allow profile update for authenticated users" ON profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para INSERT de profiles
CREATE POLICY "Allow profile insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. VERIFICAR PERMISOS DEL ROL ANON
GRANT SELECT, INSERT, UPDATE ON tb_conversations TO anon;
GRANT SELECT, INSERT, UPDATE ON tb_messages TO anon;
GRANT SELECT, INSERT, UPDATE ON profiles TO anon;

-- 7. VERIFICAR PERMISOS DEL ROL AUTHENTICATED
GRANT SELECT, INSERT, UPDATE ON tb_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tb_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- 8. VERIFICACIÓN FINAL
SELECT 'VERIFICACIÓN FINAL - ESTADO DE REALTIME' as status;

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
    AND (ppt.pubname = 'supabase_realtime' OR ppt.pubname IS NULL)
ORDER BY tablename;

SELECT 'VERIFICACIÓN FINAL - POLÍTICAS RLS' as status;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY tablename, policyname;

-- 9. MENSAJE FINAL
SELECT '
🎉 SCRIPT COMPLETADO 
📋 Verificar los resultados arriba:
- Realtime debe mostrar ✅ Habilitada para todas las tablas
- Deben existir políticas para authenticated users
- Ejecutar el test de Node.js nuevamente
' as final_message;
