-- Script para habilitar Realtime en Supabase
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- 1. Verificar el estado actual de la publicación supabase_realtime
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 2. Verificar si las tablas están en la publicación
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

-- 3. Habilitar Realtime en las tablas necesarias
-- (Solo ejecutar si las tablas no están habilitadas)

-- Habilitar tb_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;

-- Habilitar tb_messages  
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;

-- Habilitar profiles (si existe)
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 4. Verificar el resultado final
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

-- 5. Verificar permisos de la clave anónima
SELECT 
    grantee,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE grantee = 'anon' 
    AND table_name IN ('tb_conversations', 'tb_messages')
ORDER BY table_name, privilege_type;

-- 6. Verificar que la función de Realtime esté disponible
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'realtime' 
    AND routine_name LIKE '%subscription%';
