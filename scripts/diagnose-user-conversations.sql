-- =====================================================
-- DIAGNOSTICAR CONVERSACIONES DE USUARIOS EN MÚLTIPLES CLIENTES
-- =====================================================

-- 1. Verificar usuarios que tienen conversaciones en múltiples clientes
SELECT 
  'USUARIOS EN MÚLTIPLES CLIENTES' as check_name,
  '' as details;

SELECT 
  c.channel,
  c.client_id,
  cl.name as client_name,
  COUNT(*) as conversation_count
FROM tb_conversations c
JOIN clients cl ON c.client_id = cl.id
GROUP BY c.channel, c.client_id, cl.name
HAVING COUNT(*) > 0
ORDER BY c.channel, conversation_count DESC;

-- 2. Verificar conversaciones por channel (usuario)
SELECT 
  'CONVERSACIONES POR CHANNEL (USUARIO)' as check_name,
  '' as details;

SELECT 
  channel,
  client_id,
  cl.name as client_name,
  status,
  created_at,
  updated_at
FROM tb_conversations c
JOIN clients cl ON c.client_id = cl.id
ORDER BY channel, created_at DESC;

-- 3. Verificar conversaciones específicas de un channel
SELECT 
  'CONVERSACIONES DE CHANNEL ESPECÍFICO' as check_name,
  '' as details;

-- Reemplaza 'channel-name' con un channel real de tu base de datos
SELECT 
  channel,
  client_id,
  cl.name as client_name,
  status,
  created_at,
  updated_at
FROM tb_conversations c
JOIN clients cl ON c.client_id = cl.id
WHERE channel IN (
  SELECT channel 
  FROM tb_conversations 
  GROUP BY channel 
  HAVING COUNT(DISTINCT client_id) > 1
)
ORDER BY channel, created_at DESC;

-- 4. Verificar mensajes por cliente
SELECT 
  'MENSAJES POR CLIENTE' as check_name,
  '' as details;

SELECT 
  m.conversation_id,
  c.channel,
  c.client_id,
  cl.name as client_name,
  m.sender_role,
  m.content,
  m.created_at
FROM tb_messages m
JOIN tb_conversations c ON m.conversation_id = c.id
JOIN clients cl ON c.client_id = cl.id
ORDER BY m.created_at DESC
LIMIT 20;

-- 5. Verificar si hay mensajes con client_id incorrecto
SELECT 
  'MENSAJES CON CLIENT_ID INCORRECTO' as check_name,
  '' as details;

SELECT 
  m.id,
  m.conversation_id,
  c.channel,
  m.client_id as message_client_id,
  c.client_id as conversation_client_id,
  m.sender_role,
  m.content,
  m.created_at
FROM tb_messages m
JOIN tb_conversations c ON m.conversation_id = c.id
WHERE m.client_id != c.client_id
ORDER BY m.created_at DESC;

-- 6. Verificar conversaciones recientes
SELECT 
  'CONVERSACIONES MÁS RECIENTES' as check_name,
  '' as details;

SELECT 
  id,
  channel,
  status,
  client_id,
  cl.name as client_name,
  created_at,
  updated_at
FROM tb_conversations c
JOIN clients cl ON c.client_id = cl.id
ORDER BY updated_at DESC
LIMIT 10;

-- =====================================================
-- FIN DE DIAGNÓSTICO
-- =====================================================


