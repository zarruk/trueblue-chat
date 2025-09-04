-- =====================================================
-- CREACIÓN DE NUEVO CLIENTE
-- =====================================================

-- INSTRUCCIONES:
-- 1. Cambia los valores en las variables de abajo
-- 2. Ejecuta el script completo
-- 3. Usa el client_id generado para asignar usuarios

-- =====================================================
-- CONFIGURACIÓN DEL CLIENTE (CAMBIAR ESTOS VALORES)
-- =====================================================

-- Nombre del cliente
\set CLIENT_NAME 'Empresa ABC'
-- Slug único (sin espacios, solo letras, números y guiones)
\set CLIENT_SLUG 'empresa-abc'
-- Dominio del cliente
\set CLIENT_DOMAIN 'empresaabc.com'
-- URL del logo (opcional)
\set CLIENT_LOGO 'https://empresaabc.com/logo.png'
-- Color primario (hex)
\set CLIENT_PRIMARY_COLOR '#3B82F6'
-- Color secundario (hex)
\set CLIENT_SECONDARY_COLOR '#1E40AF'

-- =====================================================
-- CREACIÓN DEL CLIENTE
-- =====================================================

-- 1. Crear el cliente
INSERT INTO clients (
  name, 
  slug, 
  domain, 
  logo_url, 
  primary_color, 
  secondary_color,
  status
) VALUES (
  :'CLIENT_NAME',
  :'CLIENT_SLUG',
  :'CLIENT_DOMAIN',
  :'CLIENT_LOGO',
  :'CLIENT_PRIMARY_COLOR',
  :'CLIENT_SECONDARY_COLOR',
  'active'
) RETURNING id, name, slug;

-- 2. Obtener el client_id generado
\gset

-- 3. Crear configuraciones por defecto
INSERT INTO client_configs (client_id, config_key, config_value) VALUES
(:id, 'branding', jsonb_build_object(
  'name', :'CLIENT_NAME',
  'shortName', upper(substring(:'CLIENT_NAME', 1, 2)),
  'logo', :'CLIENT_LOGO',
  'primaryColor', :'CLIENT_PRIMARY_COLOR',
  'secondaryColor', :'CLIENT_SECONDARY_COLOR'
)),
(:id, 'features', '{"realtime": true, "templates": true, "agents": true, "analytics": true}'),
(:id, 'limits', '{"maxAgents": 20, "maxTemplates": 100, "maxConversations": 5000}'),
(:id, 'settings', '{"autoCloseHours": 24, "notifications": true, "timezone": "America/Mexico_City"}');

-- 4. Verificar que se creó correctamente
SELECT 
  'CLIENTE CREADO' as check_name,
  '' as details;

SELECT 
  'Cliente' as info,
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = :id;

SELECT 
  'Configuraciones' as info,
  config_key,
  config_value
FROM client_configs 
WHERE client_id = :id;

-- 5. Mostrar comandos para asignar usuarios
SELECT 
  'COMANDOS PARA ASIGNAR USUARIOS' as section,
  '' as details;

SELECT 
  'Para asignar usuarios a este cliente, ejecuta:' as instruction,
  'SELECT assign_user_to_client(''usuario@email.com'', ''' || :'CLIENT_SLUG' || ''');' as command;

-- =====================================================
-- FIN DE CREACIÓN
-- =====================================================


