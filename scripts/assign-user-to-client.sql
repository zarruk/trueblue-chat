-- =====================================================
-- ASIGNAR USUARIO A CLIENTE
-- =====================================================

-- INSTRUCCIONES:
-- 1. Cambia el email del usuario y el client_id
-- 2. Ejecuta el script
-- 3. Verifica que el cambio se aplicó

-- =====================================================
-- CONFIGURACIÓN (CAMBIAR ESTOS VALORES)
-- =====================================================

-- CAMBIAR: Email del usuario a asignar
-- CAMBIAR: Client ID del cliente destino

-- =====================================================
-- ASIGNACIÓN
-- =====================================================

-- 1. Verificar el usuario actual
SELECT 
  'USUARIO ACTUAL' as check_name,
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
  id,
  name,
  slug,
  domain,
  status
FROM clients 
WHERE id = 'CLIENT_ID_AQUI'; -- CAMBIAR: Client ID

-- 3. Asignar usuario al cliente
UPDATE profiles 
SET client_id = 'CLIENT_ID_AQUI' -- CAMBIAR: Client ID
WHERE email = 'usuario@email.com'; -- CAMBIAR: Email del usuario

-- 4. Verificar el cambio
SELECT 
  'DESPUÉS DE LA ASIGNACIÓN' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
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
-- FIN DE ASIGNACIÓN
-- =====================================================


