-- =====================================================
-- DIAGNÓSTICO ESPECÍFICO DEL PROBLEMA DE AGENTES
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
  status,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 2. Verificar si hay agentes en la base de datos
SELECT 
  'AGENTES EN LA BASE DE DATOS' as section,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status,
  created_at
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%'
ORDER BY name;

-- 3. Verificar agentes específicos del cliente Trueblue
SELECT 
  'AGENTES DEL CLIENTE TRUEBLUE' as section,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%'
  AND client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY name;

-- 4. Verificar si RLS está deshabilitado
SELECT 
  'ESTADO DE RLS' as section,
  '' as details;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'tb_conversations', 'tb_agents', 'message_templates')
ORDER BY tablename;

-- 5. Verificar la función get_current_user_client_id
SELECT 
  'FUNCIÓN GET_CURRENT_USER_CLIENT_ID' as section,
  '' as details;

SELECT 
  proname as function_name,
  proargtypes,
  prorettype,
  prosrc
FROM pg_proc 
WHERE proname = 'get_current_user_client_id';

-- 6. Probar la función
SELECT 
  'TEST DE LA FUNCIÓN' as section,
  '' as details;

SELECT 
  'get_current_user_client_id()' as test_name,
  get_current_user_client_id() as result;

-- 7. Simular la consulta exacta que hace la aplicación
SELECT 
  'SIMULACIÓN DE CONSULTA DE LA APLICACIÓN' as section,
  '' as details;

-- Esta es la consulta exacta que hace useAgents.tsx
SELECT 
  'Consulta de agentes (como la app)' as test_name,
  COUNT(*) as total_agentes
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%'
  AND client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 8. Verificar si hay algún problema con los tipos de datos
SELECT 
  'VERIFICACIÓN DE TIPOS DE DATOS' as section,
  '' as details;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('id', 'email', 'name', 'role', 'client_id', 'status')
ORDER BY ordinal_position;

-- 9. Verificar si hay algún trigger o constraint que pueda estar interfiriendo
SELECT 
  'TRIGGERS Y CONSTRAINTS' as section,
  '' as details;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- =====================================================
-- FIN DE DIAGNÓSTICO
-- =====================================================
