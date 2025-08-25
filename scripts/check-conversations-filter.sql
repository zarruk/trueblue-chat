-- =====================================================
-- VERIFICAR FILTRADO DE CONVERSACIONES POR CLIENTE
-- =====================================================

-- 1. Verificar usuario actual y su client_id
SELECT 
  'USUARIO ACTUAL' as check_name,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'salomon+aztec@azteclab.co';

-- 2. Verificar todas las conversaciones
SELECT 
  'TODAS LAS CONVERSACIONES' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
ORDER BY updated_at DESC;

-- 3. Verificar conversaciones por cliente específico
SELECT 
  'CONVERSACIONES DE AZTEC' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6'
ORDER BY updated_at DESC;

-- 4. Verificar conversaciones de Trueblue
SELECT 
  'CONVERSACIONES DE TRUEBLUE' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY updated_at DESC;

-- 5. Verificar conversaciones sin client_id
SELECT 
  'CONVERSACIONES SIN CLIENT_ID' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id IS NULL
ORDER BY updated_at DESC;

-- 6. Verificar RLS en tb_conversations
SELECT 
  'RLS EN TB_CONVERSATIONS' as check_name,
  '' as details;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'tb_conversations';

-- 7. Verificar políticas RLS en tb_conversations
SELECT 
  'POLÍTICAS RLS EN TB_CONVERSATIONS' as check_name,
  '' as details;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tb_conversations';

-- 8. Simular la consulta que hace la aplicación
SELECT 
  'SIMULACIÓN CONSULTA APP' as check_name,
  '' as details;

-- Simular la consulta que hace useConversations
WITH user_profile AS (
  SELECT 
    id,
    email,
    role,
    client_id
  FROM profiles 
  WHERE email = 'salomon+aztec@azteclab.co'
)
SELECT 
  c.id,
  c.channel,
  c.status,
  c.client_id,
  c.created_at,
  c.updated_at,
  up.email as user_email,
  up.role as user_role,
  up.client_id as user_client_id
FROM tb_conversations c
CROSS JOIN user_profile up
WHERE c.client_id = up.client_id
ORDER BY c.updated_at DESC;

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================


