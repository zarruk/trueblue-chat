-- =====================================================
-- VERIFICACIÓN SIMPLE DE CONVERSACIONES
-- =====================================================

-- 1. Verificar el perfil admin
SELECT 
  'PERFIL ADMIN' as check_name,
  id,
  email,
  name,
  role,
  client_id
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 2. Verificar total de conversaciones
SELECT 
  'TOTAL CONVERSACIONES' as check_name,
  COUNT(*) as total
FROM tb_conversations;

-- 3. Verificar conversaciones con client_id
SELECT 
  'CONVERSACIONES CON CLIENT_ID' as check_name,
  COUNT(*) as total
FROM tb_conversations 
WHERE client_id IS NOT NULL;

-- 4. Verificar conversaciones sin client_id
SELECT 
  'CONVERSACIONES SIN CLIENT_ID' as check_name,
  COUNT(*) as total
FROM tb_conversations 
WHERE client_id IS NULL;

-- 5. Verificar conversaciones del cliente Trueblue
SELECT 
  'CONVERSACIONES TRUEBLUE' as check_name,
  COUNT(*) as total
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 6. Verificar conversaciones por status
SELECT 
  'CONVERSACIONES POR STATUS' as check_name,
  status,
  COUNT(*) as total
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY status;

-- 7. Verificar conversaciones recientes (sin ORDER BY problemático)
SELECT 
  'CONVERSACIONES RECIENTES' as check_name,
  id,
  user_id,
  username,
  status,
  client_id
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
LIMIT 5;

-- 8. Verificar si RLS está deshabilitado
SELECT 
  'RLS EN CONVERSACIONES' as check_name,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'tb_conversations';

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================
