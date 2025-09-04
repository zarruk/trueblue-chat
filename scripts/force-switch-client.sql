-- =====================================================
-- FORZAR CAMBIO DE CLIENTE
-- =====================================================

-- 1. Verificar todos los clientes disponibles
SELECT 
  'CLIENTES DISPONIBLES' as check_name,
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

-- 2. Verificar el usuario actual
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
WHERE email = 'salomon@azteclab.co';

-- 3. Crear cliente Aztec si no existe
INSERT INTO clients (
  name, 
  slug, 
  domain, 
  logo_url, 
  primary_color, 
  secondary_color,
  status
) VALUES (
  'Aztec',
  'aztec',
  'azteclab.co',
  'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
  '#3B82F6',
  '#1E40AF',
  'active'
) ON CONFLICT (slug) DO NOTHING
RETURNING id, name, slug;

-- 4. Obtener el client_id de Aztec
\gset

-- 5. Asignar usuario al cliente Aztec
UPDATE profiles 
SET client_id = :id
WHERE email = 'salomon@azteclab.co';

-- 6. Verificar el cambio
SELECT 
  'DESPUÉS DEL CAMBIO' as check_name,
  '' as details;

SELECT 
  p.id,
  p.email,
  p.name,
  p.role,
  p.client_id,
  c.name as client_name,
  c.slug as client_slug
FROM profiles p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.email = 'salomon@azteclab.co';

-- 7. Verificar la vista current_client_info
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

-- 8. Crear configuraciones de branding para Aztec
INSERT INTO client_configs (client_id, config_key, config_value) VALUES
(:id, 'branding', '{"name": "Aztec", "shortName": "AZ", "logo": "https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512", "primaryColor": "#3B82F6", "secondaryColor": "#1E40AF"}'),
(:id, 'features', '{"realtime": true, "templates": true, "agents": true, "analytics": true}'),
(:id, 'limits', '{"maxAgents": 20, "maxTemplates": 100, "maxConversations": 5000}'),
(:id, 'settings', '{"autoCloseHours": 24, "notifications": true, "timezone": "America/Mexico_City"}')
ON CONFLICT (client_id, config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value;

-- 9. Verificar configuraciones
SELECT 
  'CONFIGURACIONES DE AZTEC' as check_name,
  '' as details;

SELECT 
  config_key,
  config_value
FROM client_configs 
WHERE client_id = :id;

-- =====================================================
-- FIN DE FORZADO
-- =====================================================


