-- =====================================================
-- FIX AZTEC CLIENT
-- =====================================================

-- 1. Verificar todos los clientes existentes
SELECT 
  'CLIENTES EXISTENTES' as check_name,
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
WHERE email = 'salomon+aztec@azteclab.co';

-- 3. Crear cliente Aztec con ID específico
INSERT INTO clients (
  id,
  name, 
  slug, 
  domain, 
  logo_url, 
  primary_color, 
  secondary_color,
  status
) VALUES (
  '9fe4df60-975f-4f57-926c-256aaa36e6e6',
  'Aztec',
  'aztec',
  'azteclab.co',
  'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
  '#3B82F6',
  '#1E40AF',
  'active'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  domain = EXCLUDED.domain,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  status = EXCLUDED.status
RETURNING id, name, slug;

-- 4. Crear configuraciones de branding para Aztec
INSERT INTO client_configs (client_id, config_key, config_value) VALUES
('9fe4df60-975f-4f57-926c-256aaa36e6e6', 'branding', '{"name": "Aztec", "shortName": "AZ", "logo": "https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512", "primaryColor": "#3B82F6", "secondaryColor": "#1E40AF"}'),
('9fe4df60-975f-4f57-926c-256aaa36e6e6', 'features', '{"realtime": true, "templates": true, "agents": true, "analytics": true}'),
('9fe4df60-975f-4f57-926c-256aaa36e6e6', 'limits', '{"maxAgents": 20, "maxTemplates": 100, "maxConversations": 5000}'),
('9fe4df60-975f-4f57-926c-256aaa36e6e6', 'settings', '{"autoCloseHours": 24, "notifications": true, "timezone": "America/Mexico_City"}')
ON CONFLICT (client_id, config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value;

-- 5. Verificar que el cliente se creó correctamente
SELECT 
  'CLIENTE AZTEC CREADO' as check_name,
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
WHERE id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 6. Verificar configuraciones
SELECT 
  'CONFIGURACIONES DE AZTEC' as check_name,
  '' as details;

SELECT 
  config_key,
  config_value
FROM client_configs 
WHERE client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 7. Verificar que el usuario está asignado correctamente
SELECT 
  'USUARIO ASIGNADO' as check_name,
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
WHERE p.email = 'salomon+aztec@azteclab.co';

-- =====================================================
-- FIN DE FIX
-- =====================================================


