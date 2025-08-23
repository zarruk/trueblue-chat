-- =====================================================
-- CORRECCIÓN DE FUNCIÓN FALTANTE
-- =====================================================

-- 1. Verificar si la función existe
SELECT 
  'Verificación de función get_current_user_client_id' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_client_id') 
    THEN '✅ EXISTE' 
    ELSE '❌ NO EXISTE' 
  END as status;

-- 2. Crear la función si no existe
CREATE OR REPLACE FUNCTION get_current_user_client_id()
RETURNS UUID AS $$
DECLARE
    user_client_id UUID;
BEGIN
    -- Obtener el client_id del usuario autenticado
    SELECT client_id INTO user_client_id
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Si no se encuentra, devolver el cliente Trueblue por defecto
    IF user_client_id IS NULL THEN
        user_client_id := '550e8400-e29b-41d4-a716-446655440000';
    END IF;
    
    RETURN user_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar que la función se creó correctamente
SELECT 
  'Función creada/actualizada' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_client_id') 
    THEN '✅ FUNCIÓN DISPONIBLE' 
    ELSE '❌ ERROR AL CREAR' 
  END as status;

-- 4. Probar la función (esto debería funcionar ahora)
SELECT 
  'Test función get_current_user_client_id' as test_name,
  get_current_user_client_id() as client_id_result;

-- 5. Verificar el perfil del usuario actual
SELECT 
  'Perfil del usuario autenticado' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE id = auth.uid();

-- 6. Si no hay usuario autenticado, mostrar todos los perfiles
SELECT 
  'Todos los perfiles (si no hay usuario autenticado)' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
ORDER BY created_at DESC;

-- =====================================================
-- FIN DE CORRECCIÓN
-- =====================================================
