-- =====================================================
-- VERIFICACIÓN DEL PERFIL Y CLIENT_ID
-- =====================================================

-- 1. Verificar el perfil específico del usuario
SELECT 
  'Perfil del usuario salomon@azteclab.co' as check_name,
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

-- 2. Verificar si hay perfiles sin client_id
SELECT 
  'Perfiles sin client_id' as check_name,
  COUNT(*) as total_sin_client_id
FROM profiles 
WHERE client_id IS NULL;

-- 3. Verificar todos los perfiles y sus client_ids
SELECT 
  'Todos los perfiles' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
ORDER BY created_at DESC;

-- 4. Verificar que el cliente Trueblue existe
SELECT 
  'Cliente Trueblue' as check_name,
  id,
  name,
  slug,
  domain
FROM clients 
WHERE slug = 'trueblue';

-- 5. Verificar la configuración del cliente Trueblue
SELECT 
  'Configuración Trueblue' as check_name,
  client_id,
  config_key,
  config_value
FROM client_configs 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 6. Verificar la función get_current_user_client_id
SELECT 
  'Función get_current_user_client_id' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_client_id') 
    THEN '✅ EXISTE' 
    ELSE '❌ NO EXISTE' 
  END as status;

-- 7. Probar la función get_current_user_client_id (sin parámetros)
SELECT 
  'Test get_current_user_client_id' as check_name,
  get_current_user_client_id() as client_id_result;

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================
