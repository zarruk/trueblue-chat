-- =====================================================
-- DIAGNÓSTICO COMPLETO DEL PROBLEMA
-- =====================================================

-- 1. Verificar estado de RLS
SELECT 
  'ESTADO DE RLS' as section,
  '' as details;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'tb_conversations', 'tb_agents', 'tb_message_templates')
ORDER BY tablename;

-- 2. Verificar perfil de juanca@azteclab.co
SELECT 
  'PERFIL DE JUANCA' as section,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'juanca@azteclab.co';

-- 3. Verificar función exec_sql
SELECT 
  'FUNCIÓN EXEC_SQL' as section,
  '' as details;

SELECT 
  proname as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'exec_sql') 
    THEN '✅ EXISTE' 
    ELSE '❌ NO EXISTE' 
  END as status
FROM pg_proc 
WHERE proname = 'exec_sql';

-- 4. Verificar cliente Trueblue
SELECT 
  'CLIENTE TRUEBLUE' as section,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 5. Verificar conversaciones del cliente
SELECT 
  'CONVERSACIONES DEL CLIENTE' as section,
  '' as details;

SELECT 
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'active_human' THEN 1 END) as active_conversations,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 6. Verificar agentes del cliente
SELECT 
  'AGENTES DEL CLIENTE' as section,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
  AND role IN ('admin', 'agent')
ORDER BY name;

-- 7. Verificar Realtime
SELECT 
  'REALTIME STATUS' as section,
  '' as details;

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

-- =====================================================
-- FIN DE DIAGNÓSTICO
-- =====================================================

