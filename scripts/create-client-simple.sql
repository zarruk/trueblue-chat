-- =====================================================
-- CREACIÓN SIMPLE DE NUEVO CLIENTE
-- =====================================================

-- INSTRUCCIONES:
-- 1. Cambia los valores en las líneas marcadas con -- CAMBIAR
-- 2. Ejecuta el script completo
-- 3. Copia el client_id generado para asignar usuarios

-- =====================================================
-- CONFIGURACIÓN DEL CLIENTE (CAMBIAR ESTOS VALORES)
-- =====================================================

-- CAMBIAR: Nombre del cliente
-- CAMBIAR: Slug único (sin espacios, solo letras, números y guiones)
-- CAMBIAR: Dominio del cliente
-- CAMBIAR: URL del logo (opcional)
-- CAMBIAR: Color primario (hex)
-- CAMBIAR: Color secundario (hex)

-- =====================================================
-- CREACIÓN DEL CLIENTE
-- =====================================================

-- 1. Crear el cliente (CAMBIAR LOS VALORES ABAJO)
INSERT INTO clients (
  name, 
  slug, 
  domain, 
  logo_url, 
  primary_color, 
  secondary_color,
  status
) VALUES (
  'Empresa ABC',                    -- CAMBIAR: Nombre del cliente
  'empresa-abc',                    -- CAMBIAR: Slug único
  'empresaabc.com',                 -- CAMBIAR: Dominio
  'https://empresaabc.com/logo.png', -- CAMBIAR: URL del logo
  '#3B82F6',                        -- CAMBIAR: Color primario
  '#1E40AF',                        -- CAMBIAR: Color secundario
  'active'
) RETURNING id, name, slug;

-- 2. Crear configuraciones por defecto (usar el client_id del resultado anterior)
-- NOTA: Reemplaza 'CLIENT_ID_AQUI' con el ID que se generó arriba
INSERT INTO client_configs (client_id, config_key, config_value) VALUES
('CLIENT_ID_AQUI', 'branding', '{"name": "Empresa ABC", "shortName": "EA", "logo": "https://empresaabc.com/logo.png", "primaryColor": "#3B82F6", "secondaryColor": "#1E40AF"}'),
('CLIENT_ID_AQUI', 'features', '{"realtime": true, "templates": true, "agents": true, "analytics": true}'),
('CLIENT_ID_AQUI', 'limits', '{"maxAgents": 20, "maxTemplates": 100, "maxConversations": 5000}'),
('CLIENT_ID_AQUI', 'settings', '{"autoCloseHours": 24, "notifications": true, "timezone": "America/Mexico_City"}');

-- 3. Verificar que se creó correctamente
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

-- 4. Mostrar comandos para asignar usuarios
SELECT 
  'COMANDOS PARA ASIGNAR USUARIOS' as section,
  '' as details;

SELECT 
  'Para asignar usuarios, ejecuta:' as instruction,
  'UPDATE profiles SET client_id = ''CLIENT_ID_AQUI'' WHERE email = ''usuario@email.com'';' as command;

-- =====================================================
-- FIN DE CREACIÓN
-- =====================================================
