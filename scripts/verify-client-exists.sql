-- =====================================================
-- VERIFICAR SI EL CLIENTE AZTEC EXISTE
-- =====================================================

-- 1. Verificar si el cliente existe por ID
SELECT 
  'CLIENTE POR ID' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status,
  created_at
FROM clients 
WHERE id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 2. Verificar si el cliente existe por slug
SELECT 
  'CLIENTE POR SLUG' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status,
  created_at
FROM clients 
WHERE slug = 'aztec';

-- 3. Verificar si el cliente existe por nombre
SELECT 
  'CLIENTE POR NOMBRE' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status,
  created_at
FROM clients 
WHERE name = 'Aztec';

-- 4. Listar todos los clientes
SELECT 
  'TODOS LOS CLIENTES' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status,
  created_at
FROM clients 
ORDER BY created_at DESC;

-- 5. Verificar permisos RLS en la tabla clients
SELECT 
  'POLÍTICAS RLS EN CLIENTS' as check_name,
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
WHERE tablename = 'clients';

-- 6. Verificar si RLS está habilitado en clients
SELECT 
  'RLS EN CLIENTS' as check_name,
  '' as details;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'clients';

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================


