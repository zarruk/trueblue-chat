-- =====================================================
-- DIAGNÓSTICO DEL PROBLEMA DE CONVERSACIONES
-- =====================================================

-- 1. Verificar el estado actual del perfil admin
SELECT 
  'ESTADO DEL PERFIL ADMIN' as section,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 2. Verificar conversaciones en la base de datos
SELECT 
  'CONVERSACIONES EN LA BASE DE DATOS' as section,
  '' as details;

SELECT 
  id,
  user_id,
  username,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Verificar conversaciones del cliente Trueblue
SELECT 
  'CONVERSACIONES DEL CLIENTE TRUEBLUE' as section,
  '' as details;

SELECT 
  id,
  user_id,
  username,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Verificar conversaciones sin client_id
SELECT 
  'CONVERSACIONES SIN CLIENT_ID' as section,
  '' as details;

SELECT 
  COUNT(*) as total_sin_client_id
FROM tb_conversations 
WHERE client_id IS NULL;

-- 5. Verificar conversaciones sin client_id (detalle)
SELECT 
  'DETALLE CONVERSACIONES SIN CLIENT_ID' as section,
  '' as details;

SELECT 
  id,
  user_id,
  username,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id IS NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 6. Verificar si RLS está deshabilitado en conversaciones
SELECT 
  'ESTADO DE RLS EN CONVERSACIONES' as section,
  '' as details;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'tb_conversations';

-- 7. Probar la función get_current_user_client_id
SELECT 
  'FUNCIÓN GET_CURRENT_USER_CLIENT_ID' as section,
  '' as details;

SELECT 
  'get_current_user_client_id()' as test_name,
  get_current_user_client_id() as result;

-- 8. Simular la consulta exacta que hace la aplicación
SELECT 
  'SIMULACIÓN DE CONSULTA DE CONVERSACIONES' as section,
  '' as details;

-- Esta es la consulta exacta que hace useConversations.tsx
SELECT 
  'Consulta de conversaciones (como la app)' as test_name,
  COUNT(*) as total_conversaciones
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 9. Verificar conversaciones con filtro de status
SELECT 
  'CONVERSACIONES POR STATUS' as section,
  '' as details;

SELECT 
  status,
  COUNT(*) as count
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY status
ORDER BY count DESC;

-- 10. Verificar conversaciones recientes
SELECT 
  'CONVERSACIONES MÁS RECIENTES' as section,
  '' as details;

SELECT 
  id,
  user_id,
  username,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY updated_at DESC
LIMIT 5;

-- =====================================================
-- FIN DE DIAGNÓSTICO
-- =====================================================
