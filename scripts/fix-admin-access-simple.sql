-- =====================================================
-- CORRECCIÓN SIMPLE DE ACCESO PARA ADMINS
-- =====================================================

-- 1. Deshabilitar temporalmente RLS para testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tb_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tb_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE tb_message_templates DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que el usuario admin tiene el client_id correcto
UPDATE profiles 
SET client_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE email = 'salomon@azteclab.co';

-- 3. Verificar el estado actual
SELECT 
  'Estado del perfil admin' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 4. Probar consulta sin RLS
SELECT 
  'Test sin RLS - Total agentes' as test_name,
  COUNT(*) as total_agentes
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%';

-- 5. Probar consulta filtrada por cliente
SELECT 
  'Test sin RLS - Agentes del cliente Trueblue' as test_name,
  COUNT(*) as total_agentes
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%'
  AND client_id = '550e8400-e29b-41d4-a716-446655440000';

-- =====================================================
-- FIN DE CORRECCIÓN TEMPORAL
-- =====================================================
