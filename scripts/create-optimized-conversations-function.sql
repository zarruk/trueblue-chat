-- Función SQL optimizada para obtener conversaciones con último mensaje
-- Esto elimina el problema N+1 queries

CREATE OR REPLACE FUNCTION get_conversations_with_last_message(
  client_id_param UUID DEFAULT NULL,
  offset_param INTEGER DEFAULT 0,
  limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  username TEXT,
  phone_number TEXT,
  status TEXT,
  assigned_agent_id TEXT,
  assigned_agent_email TEXT,
  assigned_agent_name TEXT,
  summary TEXT,
  channel TEXT,
  client_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_sender_role TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_content TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.user_id,
    c.username,
    c.phone_number,
    c.status,
    c.assigned_agent_id,
    c.assigned_agent_email,
    c.assigned_agent_name,
    c.summary,
    c.channel,
    c.client_id,
    c.created_at,
    c.updated_at,
    lm.sender_role as last_message_sender_role,
    lm.created_at as last_message_at,
    lm.content as last_message_content
  FROM tb_conversations c
  LEFT JOIN LATERAL (
    SELECT sender_role, content, created_at
    FROM tb_messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) lm ON true
  WHERE 
    (client_id_param IS NULL OR c.client_id = client_id_param)
  ORDER BY c.updated_at DESC
  OFFSET offset_param
  LIMIT limit_param;
$$;

-- Comentario: Esta función optimiza la consulta de conversaciones con último mensaje
-- eliminando el problema N+1 queries que ocurría al hacer una consulta por cada conversación

