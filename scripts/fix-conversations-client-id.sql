-- =====================================================
-- CORRECCIÓN DE CLIENT_ID EN CONVERSACIONES
-- =====================================================

-- 1. Verificar conversaciones sin client_id
SELECT 
  'CONVERSACIONES SIN CLIENT_ID' as check_name,
  COUNT(*) as total_sin_client_id
FROM tb_conversations 
WHERE client_id IS NULL;

-- 2. Verificar conversaciones con client_id
SELECT 
  'CONVERSACIONES CON CLIENT_ID' as check_name,
  COUNT(*) as total_con_client_id
FROM tb_conversations 
WHERE client_id IS NOT NULL;

-- 3. Asignar client_id a conversaciones que no lo tienen
UPDATE tb_conversations 
SET client_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE client_id IS NULL;

-- 4. Verificar el cambio
SELECT 
  'DESPUÉS DE LA CORRECCIÓN' as check_name,
  '' as details;

SELECT 
  'Conversaciones sin client_id' as metric,
  COUNT(*)::text as value
FROM tb_conversations 
WHERE client_id IS NULL;

SELECT 
  'Conversaciones con client_id' as metric,
  COUNT(*)::text as value
FROM tb_conversations 
WHERE client_id IS NOT NULL;

SELECT 
  'Conversaciones del cliente Trueblue' as metric,
  COUNT(*)::text as value
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000';

-- 5. Verificar conversaciones recientes
SELECT 
  'CONVERSACIONES MÁS RECIENTES' as check_name,
  '' as details;

SELECT 
  id,
  user_id,
  username,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY updated_at DESC
LIMIT 10;

-- 6. Verificar conversaciones por status
SELECT 
  'CONVERSACIONES POR STATUS' as check_name,
  '' as details;

SELECT 
  status,
  COUNT(*) as count
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- FIN DE CORRECCIÓN
-- =====================================================
