-- =====================================================
-- CORREGIR CONVERSACIONES EN CLIENTE INCORRECTO
-- =====================================================

-- 1. Verificar conversaciones que están en el cliente incorrecto
SELECT 
  'CONVERSACIONES EN CLIENTE INCORRECTO' as check_name,
  '' as details;

-- Identificar conversaciones que deberían estar en Aztec pero están en Trueblue
SELECT 
  id,
  channel,
  status,
  client_id,
  created_at,
  updated_at,
  CASE 
    WHEN client_id = '550e8400-e29b-41d4-a716-446655440000' THEN 'Trueblue'
    WHEN client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6' THEN 'Aztec'
    ELSE 'Otro'
  END as current_client
FROM tb_conversations 
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;

-- 2. Mover conversaciones recientes de Trueblue a Aztec
-- (Esto es temporal - en producción deberías tener una lógica más sofisticada)
UPDATE tb_conversations 
SET 
  client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6',
  updated_at = NOW()
WHERE client_id = '550e8400-e29b-41d4-a716-446655440000'
  AND created_at > NOW() - INTERVAL '7 days'; -- Solo conversaciones de los últimos 7 días

-- 3. Actualizar mensajes correspondientes
UPDATE tb_messages 
SET 
  client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6'
WHERE conversation_id IN (
  SELECT id 
  FROM tb_conversations 
  WHERE client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6'
);

-- 4. Verificar conversaciones después de la corrección
SELECT 
  'CONVERSACIONES DESPUÉS DE LA CORRECCIÓN' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  CASE 
    WHEN client_id = '550e8400-e29b-41d4-a716-446655440000' THEN 'Trueblue'
    WHEN client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6' THEN 'Aztec'
    ELSE 'Otro'
  END as client_name,
  created_at,
  updated_at
FROM tb_conversations 
ORDER BY updated_at DESC;

-- 5. Verificar mensajes después de la corrección
SELECT 
  'MENSAJES DESPUÉS DE LA CORRECCIÓN' as check_name,
  '' as details;

SELECT 
  m.id,
  m.conversation_id,
  c.channel,
  m.client_id,
  CASE 
    WHEN m.client_id = '550e8400-e29b-41d4-a716-446655440000' THEN 'Trueblue'
    WHEN m.client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6' THEN 'Aztec'
    ELSE 'Otro'
  END as client_name,
  m.sender_role,
  m.content,
  m.created_at
FROM tb_messages m
JOIN tb_conversations c ON m.conversation_id = c.id
ORDER BY m.created_at DESC
LIMIT 20;

-- 6. Verificar conversaciones por cliente
SELECT 
  'CONVERSACIONES POR CLIENTE' as check_name,
  '' as details;

SELECT 
  CASE 
    WHEN client_id = '550e8400-e29b-41d4-a716-446655440000' THEN 'Trueblue'
    WHEN client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6' THEN 'Aztec'
    ELSE 'Otro'
  END as client_name,
  COUNT(*) as total_conversations
FROM tb_conversations 
GROUP BY client_id
ORDER BY total_conversations DESC;

-- 7. Crear política para evitar futuros problemas
-- Asegurar que las nuevas conversaciones se creen con el client_id correcto
-- Esto se puede hacer en el código de la aplicación

-- =====================================================
-- FIN DE CORRECCIÓN
-- =====================================================


