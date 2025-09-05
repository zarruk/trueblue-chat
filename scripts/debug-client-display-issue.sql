-- =====================================================
-- DIAGNÓSTICO DEL PROBLEMA DE NOMBRE DEL CLIENTE
-- =====================================================

-- 1. Verificar el perfil del usuario actual
SELECT 
  'PERFIL DEL USUARIO ACTUAL' as check_name,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'salomon@azteclab.co';

-- 2. Verificar todos los clientes disponibles
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

-- 3. Verificar la función get_current_user_client_id
SELECT 
  'FUNCIÓN GET_CURRENT_USER_CLIENT_ID' as check_name,
  '' as details;

SELECT 
  'get_current_user_client_id()' as test_name,
  get_current_user_client_id() as result;

-- 4. Verificar la vista current_client_info
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

-- 5. Verificar qué cliente debería mostrar
SELECT 
  'CLIENTE QUE DEBERÍA MOSTRAR' as check_name,
  '' as details;

SELECT 
  p.email,
  p.name as user_name,
  p.client_id,
  c.name as client_name,
  c.slug as client_slug,
  c.domain as client_domain
FROM profiles p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.email = 'salomon@azteclab.co';

-- 6. Verificar configuraciones de branding del cliente actual
SELECT 
  'CONFIGURACIONES DE BRANDING' as check_name,
  '' as details;

SELECT 
  cc.client_id,
  cc.config_key,
  cc.config_value
FROM client_configs cc
JOIN profiles p ON cc.client_id = p.client_id
WHERE p.email = 'salomon@azteclab.co'
  AND cc.config_key = 'branding';

-- 7. Simular el cálculo del nombre de display
SELECT 
  'SIMULACIÓN DEL NOMBRE DE DISPLAY' as check_name,
  '' as details;

SELECT 
  'Nombre que debería mostrar' as display_name,
  CASE 
    WHEN cc.config_value->>'name' IS NOT NULL THEN cc.config_value->>'name'
    ELSE c.name
  END as final_name
FROM profiles p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN client_configs cc ON c.id = cc.client_id AND cc.config_key = 'branding'
WHERE p.email = 'salomon@azteclab.co';

-- =====================================================
-- FIN DE DIAGNÓSTICO
-- =====================================================


