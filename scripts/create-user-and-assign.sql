-- =====================================================
-- CREAR USUARIO Y ASIGNAR A CLIENTE
-- =====================================================

-- INSTRUCCIONES:
-- 1. Cambia el email, nombre y client_id
-- 2. Ejecuta el script
-- 3. El usuario se creará y se asignará automáticamente

-- =====================================================
-- CONFIGURACIÓN (CAMBIAR ESTOS VALORES)
-- =====================================================

-- CAMBIAR: Email del usuario
-- CAMBIAR: Nombre del usuario
-- CAMBIAR: Client ID del cliente
-- CAMBIAR: Rol del usuario (admin, agent, ai)

-- =====================================================
-- CREACIÓN Y ASIGNACIÓN
-- =====================================================

-- 1. Verificar si el usuario ya existe
SELECT 
  'VERIFICACIÓN DE USUARIO EXISTENTE' as check_name,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'usuario@email.com'; -- CAMBIAR: Email del usuario

-- 2. Verificar el cliente destino
SELECT 
  'CLIENTE DESTINO' as check_name,
  '' as details;

SELECT 
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = 'CLIENT_ID_AQUI'; -- CAMBIAR: Client ID

-- 3. Crear usuario si no existe, o actualizar si existe
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  client_id,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- Generar ID único
  'usuario@email.com', -- CAMBIAR: Email del usuario
  'Nombre Usuario', -- CAMBIAR: Nombre del usuario
  'admin', -- CAMBIAR: Rol (admin, agent, ai)
  'CLIENT_ID_AQUI', -- CAMBIAR: Client ID
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  client_id = EXCLUDED.client_id,
  status = EXCLUDED.status,
  updated_at = NOW()
RETURNING id, email, name, role, client_id, status;

-- 4. Verificar el resultado
SELECT 
  'USUARIO CREADO/ACTUALIZADO' as check_name,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  client_id,
  status,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'usuario@email.com'; -- CAMBIAR: Email del usuario

-- 5. Verificar usuarios del cliente
SELECT 
  'USUARIOS DEL CLIENTE' as check_name,
  '' as details;

SELECT 
  id,
  email,
  name,
  role,
  status,
  created_at
FROM profiles 
WHERE client_id = 'CLIENT_ID_AQUI' -- CAMBIAR: Client ID
ORDER BY name;

-- =====================================================
-- FIN DE CREACIÓN Y ASIGNACIÓN
-- =====================================================


