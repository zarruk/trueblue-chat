-- =====================================================
-- VERIFICAR PROBLEMA RLS EN CLIENTS
-- =====================================================

-- 1. Verificar si RLS está habilitado en clients
SELECT 
  'RLS EN CLIENTS' as check_name,
  '' as details;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'clients';

-- 2. Verificar políticas RLS en clients
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

-- 3. Verificar si el cliente existe (sin RLS)
SELECT 
  'CLIENTE SIN RLS' as check_name,
  '' as details;

-- Deshabilitar RLS temporalmente
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

SELECT 
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 4. Verificar usuario actual
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

-- 5. Verificar si el usuario tiene permisos
SELECT 
  'PERMISOS DE USUARIO' as check_name,
  '' as details;

SELECT 
  current_user,
  session_user,
  auth.uid() as auth_uid;

-- 6. Habilitar RLS nuevamente
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 7. Crear política temporal para permitir acceso
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON clients;
CREATE POLICY "Allow authenticated users to read clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

-- 8. Verificar cliente después de la política
SELECT 
  'CLIENTE CON NUEVA POLÍTICA' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================


