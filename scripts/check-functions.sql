-- =====================================================
-- VERIFICAR FUNCIONES RPC
-- =====================================================

-- 1. Verificar si las funciones existen
SELECT 
  'FUNCIONES EXISTENTES' as check_name,
  '' as details;

SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname IN ('get_client_info', 'get_client_branding_config');

-- 2. Verificar funciones RPC disponibles
SELECT 
  'FUNCIONES RPC DISPONIBLES' as check_name,
  '' as details;

SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('get_client_info', 'get_client_branding_config');

-- 3. Verificar si el cliente existe directamente
SELECT 
  'CLIENTE DIRECTO' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 4. Verificar configuraciones directamente
SELECT 
  'CONFIGURACIONES DIRECTO' as check_name,
  '' as details;

SELECT 
  config_key,
  config_value
FROM client_configs 
WHERE client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================


