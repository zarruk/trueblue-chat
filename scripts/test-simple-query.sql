-- =====================================================
-- PRUEBA SIMPLE DE CONSULTA DE AGENTES
-- =====================================================

-- 1. Verificar que hay datos en la tabla profiles
SELECT 
  'TOTAL DE PERFILES' as test_name,
  COUNT(*) as count
FROM profiles;

-- 2. Verificar agentes sin filtros
SELECT 
  'AGENTES SIN FILTROS' as test_name,
  COUNT(*) as count
FROM profiles 
WHERE role IN ('agent', 'admin');

-- 3. Verificar agentes sin filtros (detalle)
SELECT 
  'DETALLE DE AGENTES' as test_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE role IN ('agent', 'admin')
ORDER BY name;

-- 4. Verificar agentes con filtro de cliente específico
SELECT 
  'AGENTES DEL CLIENTE TRUEBLUE' as test_name,
  COUNT(*) as count
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 5. Verificar agentes con filtro de cliente específico (detalle)
SELECT 
  'DETALLE DE AGENTES TRUEBLUE' as test_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY name;

-- 6. Verificar si hay agentes con client_id NULL
SELECT 
  'AGENTES CON CLIENT_ID NULL' as test_name,
  COUNT(*) as count
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND client_id IS NULL;

-- 7. Verificar si hay agentes con client_id NULL (detalle)
SELECT 
  'DETALLE DE AGENTES SIN CLIENT_ID' as test_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE role IN ('agent', 'admin')
  AND client_id IS NULL
ORDER BY name;

-- 8. Verificar el cliente Trueblue existe
SELECT 
  'CLIENTE TRUEBLUE' as test_name,
  id,
  name,
  slug,
  status
FROM clients 
WHERE slug = 'trueblue';

-- =====================================================
-- FIN DE PRUEBA
-- =====================================================
