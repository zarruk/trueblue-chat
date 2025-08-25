-- =====================================================
-- CAMBIAR USUARIO A CLIENTE AZTEC
-- =====================================================

-- 1. Verificar el cliente Aztec
SELECT 
  'CLIENTE AZTEC' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE slug = 'aztec' OR name = 'Aztec';

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

-- 3. Cambiar el usuario al cliente Aztec
UPDATE profiles 
SET client_id = (
  SELECT id FROM clients 
  WHERE slug = 'aztec' OR name = 'Aztec'
  LIMIT 1
)
WHERE email = 'salomon@azteclab.co';

-- 4. Verificar el cambio
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

-- 5. Verificar la vista current_client_info
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

-- =====================================================
-- FIN DE CAMBIO
-- =====================================================


