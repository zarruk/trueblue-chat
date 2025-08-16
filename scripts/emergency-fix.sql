-- SOLUCIÓN DE EMERGENCIA PARA DESARROLLO
-- ⚠️ EJECUTAR EN SUPABASE DASHBOARD > SQL EDITOR ⚠️

-- 1. DESHABILITAR RLS TEMPORALMENTE (SOLO DESARROLLO)
ALTER TABLE tb_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tb_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. HABILITAR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 3. GRANT PERMISOS COMPLETOS (SOLO DESARROLLO)
GRANT ALL ON tb_conversations TO anon, authenticated;
GRANT ALL ON tb_messages TO anon, authenticated;  
GRANT ALL ON profiles TO anon, authenticated;

-- 4. VERIFICACIÓN
SELECT 'RLS DESHABILITADO - SOLO PARA DESARROLLO' as warning;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY tablename;

SELECT 'REALTIME HABILITADO PARA:' as status;
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('tb_conversations', 'tb_messages', 'profiles')
ORDER BY tablename;

-- ⚠️ IMPORTANTE: DESPUÉS DE ARREGLAR, VOLVER A HABILITAR RLS:
-- ALTER TABLE tb_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tb_conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
