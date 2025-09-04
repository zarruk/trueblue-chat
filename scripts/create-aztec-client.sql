-- =====================================================
-- CREAR CLIENTE AZTEC CON ID ESPECÍFICO
-- =====================================================

-- 1. Verificar clientes existentes
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

-- 2. Crear cliente Aztec con ID específico
INSERT INTO clients (
  id,
  name, 
  slug, 
  domain, 
  logo_url, 
  primary_color, 
  secondary_color,
  status,
  created_at,
  updated_at
) VALUES (
  '9fe4df60-975f-4f57-926c-256aaa36e6e6',
  'Aztec',
  'aztec',
  'azteclab.co',
  'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
  '#3B82F6',
  '#1E40AF',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  domain = EXCLUDED.domain,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  status = EXCLUDED.status,
  updated_at = NOW()
RETURNING id, name, slug, status;

-- 3. Verificar que el cliente se creó
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
  status,
  created_at,
  updated_at
FROM clients 
WHERE id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 4. Verificar configuraciones existentes
SELECT 
  'CONFIGURACIONES EXISTENTES' as check_name,
  '' as details;

SELECT 
  config_key,
  config_value
FROM client_configs 
WHERE client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6';

-- 5. Verificar usuario asignado
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
-- FIN DE CREACIÓN
-- =====================================================


