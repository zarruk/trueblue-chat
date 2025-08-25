-- =====================================================
-- VERIFICACIÓN DEL NOMBRE DEL CLIENTE
-- =====================================================

-- 1. Verificar la vista current_client_info
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

-- 2. Verificar la tabla clients
SELECT 
  'TABLA CLIENTS' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  logo_url,
  primary_color,
  secondary_color,
  status
FROM clients 
ORDER BY created_at DESC;

-- 3. Verificar configuraciones de branding
SELECT 
  'CONFIGURACIONES DE BRANDING' as check_name,
  '' as details;

SELECT 
  client_id,
  config_key,
  config_value
FROM client_configs 
WHERE config_key = 'branding'
ORDER BY client_id;

-- 4. Verificar función get_current_user_client_id
SELECT 
  'FUNCIÓN GET_CURRENT_USER_CLIENT_ID' as check_name,
  '' as details;

SELECT 
  'get_current_user_client_id()' as test_name,
  get_current_user_client_id() as result;

-- 5. Simular lo que hace la aplicación
SELECT 
  'SIMULACIÓN DE LA APLICACIÓN' as check_name,
  '' as details;

-- Esto es lo que hace getClientDisplayName()
SELECT 
  'Nombre que se muestra en la interfaz' as display_name,
  CASE 
    WHEN branding_config->>'name' IS NOT NULL THEN branding_config->>'name'
    ELSE name
  END as final_name
FROM current_client_info;

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================


