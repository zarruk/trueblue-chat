-- Script para verificar y habilitar Realtime en Supabase
-- Ejecutar este script paso a paso en la consola SQL de Supabase

-- 1. Verificar qué tablas están habilitadas para Realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- 2. Si las tablas no aparecen, habilitarlas:
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 3. Verificar nuevamente que están habilitadas
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY tablename;

-- 4. Verificar que las tablas existen
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY table_name;

-- 5. Verificar permisos de la publicación
SELECT pubname, pubowner, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
FROM pg_publication 
WHERE pubname = 'supabase_realtime';

-- 6. Si hay problemas, recrear la publicación (¡CUIDADO! Solo en desarrollo)
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime FOR TABLE tb_conversations, tb_messages, profiles;

-- 7. Verificar estado de replicación
SELECT schemaname, tablename, hasinserts, hasupdates, hasdeletes, hassubset
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('tb_conversations', 'tb_messages', 'profiles');
