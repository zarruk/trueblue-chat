-- =====================================================
-- CREAR PERFIL PARA JUANCA@AZTECLAB.CO
-- =====================================================

-- 1. Deshabilitar RLS temporalmente para poder crear el perfil
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Crear perfil para juanca@azteclab.co
INSERT INTO profiles (
    id,
    user_id,
    email,
    name,
    role,
    status,
    client_id,
    created_at,
    updated_at
) VALUES (
    '8ecde4ee-72f5-42c3-aec8-98eb60ea0a1c', -- ID del usuario de auth
    '8ecde4ee-72f5-42c3-aec8-98eb60ea0a1c', -- user_id
    'juanca@azteclab.co',
    'Juan Camilo',
    'admin',
    'active',
    '550e8400-e29b-41d4-a716-446655440000', -- Client ID de Trueblue
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    client_id = EXCLUDED.client_id,
    updated_at = NOW();

-- 3. Verificar que el perfil se creó correctamente
SELECT 
  'Perfil creado para juanca@azteclab.co' as check_name,
  id,
  email,
  name,
  role,
  client_id,
  status
FROM profiles 
WHERE email = 'juanca@azteclab.co';

-- 4. Rehabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FIN DE CREACIÓN DE PERFIL
-- =====================================================

