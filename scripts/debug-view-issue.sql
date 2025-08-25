-- =====================================================
-- DIAGNÓSTICO DE LA VISTA CURRENT_CLIENT_INFO
-- =====================================================

-- 1. Verificar el usuario actual y su client_id
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

-- 2. Verificar todos los clientes
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

-- 3. Verificar la función get_current_user_client_id()
SELECT 
  'FUNCIÓN GET_CURRENT_USER_CLIENT_ID' as check_name,
  '' as details;

SELECT get_current_user_client_id() as client_id_result;

-- 4. Verificar la vista current_client_info directamente
SELECT 
  'VISTA CURRENT_CLIENT_INFO' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  logo_url,
  primary_color,
  secondary_color,
  branding_config
FROM current_client_info;

-- 5. Simular la lógica de la vista manualmente
SELECT 
  'SIMULACIÓN MANUAL DE LA VISTA' as check_name,
  '' as details;

-- Obtener el client_id del usuario actual
WITH user_client AS (
  SELECT 
    p.client_id,
    p.email
  FROM profiles p
  WHERE p.email = 'salomon+aztec@azteclab.co'
)
SELECT 
  c.id,
  c.name,
  c.slug,
  c.domain,
  c.logo_url,
  c.primary_color,
  c.secondary_color,
  c.status,
  uc.email as user_email,
  uc.client_id as user_client_id
FROM clients c
LEFT JOIN user_client uc ON c.id = uc.client_id
WHERE c.id = COALESCE(uc.client_id, '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- 6. Verificar si hay algún problema con la vista
SELECT 
  'DEFINICIÓN DE LA VISTA' as check_name,
  '' as details;

SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'current_client_info';

-- 7. Verificar configuraciones de branding
SELECT 
  'CONFIGURACIONES DE BRANDING' as check_name,
  '' as details;

SELECT 
  cc.client_id,
  c.name as client_name,
  cc.config_key,
  cc.config_value
FROM client_configs cc
JOIN clients c ON cc.client_id = c.id
WHERE cc.config_key = 'branding'
ORDER BY c.name;

-- =====================================================
-- FIN DE DIAGNÓSTICO
-- =====================================================


