-- =====================================================
-- CREAR CONVERSACIÓN DE PRUEBA PARA AZTEC
-- =====================================================

-- 1. Verificar conversaciones existentes de Aztec
SELECT 
  'CONVERSACIONES EXISTENTES DE AZTEC' as check_name,
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
ORDER BY created_at DESC;

-- 2. Crear una conversación de prueba para Aztec
INSERT INTO tb_conversations (
  channel,
  status,
  client_id,
  created_at,
  updated_at
) VALUES (
  'test-aztec-channel',
  'pending_human',
  '9fe4df60-975f-4f57-926c-256aaa36e6e6',
  NOW(),
  NOW()
) RETURNING id, channel, status, client_id;

-- 3. Crear un mensaje de prueba para la conversación
INSERT INTO tb_messages (
  conversation_id,
  sender_role,
  content,
  client_id,
  created_at
) VALUES (
  (SELECT id FROM tb_conversations WHERE channel = 'test-aztec-channel' AND client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6' LIMIT 1),
  'user',
  'Hola, esta es una conversación de prueba para Aztec',
  '9fe4df60-975f-4f57-926c-256aaa36e6e6',
  NOW()
);

-- 4. Verificar conversaciones después de crear la de prueba
SELECT 
  'CONVERSACIONES DESPUÉS DE CREAR PRUEBA' as check_name,
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
ORDER BY created_at DESC;

-- 5. Verificar mensajes de la conversación de prueba
SELECT 
  'MENSAJES DE LA CONVERSACIÓN DE PRUEBA' as check_name,
  '' as details;

SELECT 
  m.id,
  m.conversation_id,
  m.sender_role,
  m.content,
  m.client_id,
  m.created_at
FROM tb_messages m
JOIN tb_conversations c ON m.conversation_id = c.id
WHERE c.client_id = '9fe4df60-975f-4f57-926c-256aaa36e6e6'
ORDER BY m.created_at DESC;

-- 6. Verificar todas las conversaciones por cliente
SELECT 
  'TODAS LAS CONVERSACIONES POR CLIENTE' as check_name,
  '' as details;

SELECT 
  client_id,
  COUNT(*) as total_conversations
FROM tb_conversations 
GROUP BY client_id
ORDER BY total_conversations DESC;

-- =====================================================
-- FIN DE PRUEBA
-- =====================================================


