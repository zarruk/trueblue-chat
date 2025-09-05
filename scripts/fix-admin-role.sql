-- =====================================================
-- CAMBIAR ROL A ADMIN
-- =====================================================

-- 1. Verificar el rol actual
SELECT 
  'ROL ACTUAL' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 2. Cambiar el rol a admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'salomon@azteclab.co';

-- 3. Verificar el cambio
SELECT 
  'ROL DESPUÉS DEL CAMBIO' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 4. Verificar que ahora aparece en la lista de agentes
SELECT 
  'AGENTES DESPUÉS DEL CAMBIO' as check_name,
  COUNT(*) as total_agentes
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND email NOT ILIKE 'deleted_%'
  AND client_id = '550e8400-e29b-41d4-a716-446655440000';

-- =====================================================
-- FIN DE CAMBIO
-- =====================================================
