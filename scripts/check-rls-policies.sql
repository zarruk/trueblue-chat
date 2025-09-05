-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS RLS
-- =====================================================

-- 1. Verificar políticas en la tabla profiles
SELECT 
  'Políticas en profiles' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Verificar si RLS está habilitado en profiles
SELECT 
  'RLS en profiles' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'profiles' 
      AND rowsecurity = true
    ) 
    THEN '✅ HABILITADO' 
    ELSE '❌ DESHABILITADO' 
  END as status;

-- 3. Verificar el rol actual del usuario
SELECT 
  'Rol del usuario salomon@azteclab.co' as check_name,
  id,
  email,
  name,
  role,
  client_id
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 4. Probar consulta directa para ver qué error específico obtenemos
-- (Esto simula lo que hace la aplicación)
SELECT 
  'Test consulta agentes' as test_name,
  COUNT(*) as total_agentes
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%'
  AND client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 5. Verificar políticas en otras tablas relacionadas
SELECT 
  'Políticas en tb_conversations' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tb_conversations'
ORDER BY policyname;

SELECT 
  'Políticas en tb_agents' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tb_agents'
ORDER BY policyname;

SELECT 
  'Políticas en tb_message_templates' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tb_message_templates'
ORDER BY policyname;

-- 6. Verificar función get_current_user_client_id
SELECT 
  'Función get_current_user_client_id' as check_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_current_user_client_id';

-- 7. Probar la función (sin parámetros)
SELECT 
  'Test get_current_user_client_id' as test_name,
  get_current_user_client_id() as client_id_result;

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================
