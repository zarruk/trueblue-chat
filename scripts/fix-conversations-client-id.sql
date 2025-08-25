-- =====================================================
-- FIX CONVERSATIONS CLIENT_ID
-- =====================================================

-- 1. Verificar conversaciones sin client_id
SELECT 
  'CONVERSACIONES SIN CLIENT_ID' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id IS NULL
ORDER BY created_at DESC;

-- 2. Verificar conversaciones con client_id
SELECT 
  'CONVERSACIONES CON CLIENT_ID' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id IS NOT NULL
ORDER BY created_at DESC;

-- 3. Asignar client_id a conversaciones que no lo tengan
-- Por defecto, asignar al cliente Trueblue (cliente por defecto)
UPDATE tb_conversations 
SET client_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE client_id IS NULL;

-- 4. Verificar conversaciones después del fix
SELECT 
  'CONVERSACIONES DESPUÉS DEL FIX' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
ORDER BY updated_at DESC;

-- 5. Verificar conversaciones por cliente específico
SELECT 
  'CONVERSACIONES DE AZTEC' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6'
ORDER BY updated_at DESC;

-- 6. Verificar conversaciones de Trueblue
SELECT 
  'CONVERSACIONES DE TRUEBLUE' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY updated_at DESC;

-- 7. Verificar mensajes también tienen client_id
SELECT 
  'MENSAJES SIN CLIENT_ID' as check_name,
  '' as details;

SELECT 
  id,
  conversation_id,
  sender_role,
  content,
  client_id,
  created_at
FROM tb_messages 
WHERE client_id IS NULL
ORDER BY created_at DESC;

-- 8. Asignar client_id a mensajes basado en su conversación
UPDATE tb_messages 
SET client_id = (
  SELECT c.client_id 
  FROM tb_conversations c 
  WHERE c.id = tb_messages.conversation_id
)
WHERE client_id IS NULL;

-- 9. Verificar mensajes después del fix
SELECT 
  'MENSAJES DESPUÉS DEL FIX' as check_name,
  '' as details;

SELECT 
  id,
  conversation_id,
  sender_role,
  content,
  client_id,
  created_at
FROM tb_messages 
ORDER BY created_at DESC;

-- =====================================================
-- FIN DE FIX
-- =====================================================
