-- Función para obtener conversaciones ordenadas por prioridad
-- Ejecutar en SQL Editor de Supabase

CREATE OR REPLACE FUNCTION get_prioritized_conversations(
  p_client_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_is_admin boolean DEFAULT false,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id text,
  username text,
  phone_number text,
  status text,
  assigned_agent_id uuid,
  assigned_agent_email text,
  assigned_agent_name text,
  summary text,
  channel text,
  client_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
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
    c.updated_at
  FROM tb_conversations c
  WHERE 
    -- Filtro por cliente
    (p_client_id IS NULL OR c.client_id = p_client_id)
    -- Filtro por rol
    AND (
      p_is_admin = true 
      OR c.assigned_agent_id = p_agent_id 
      OR c.status IN ('pending_human', 'active_ai')
    )
  ORDER BY
    -- 🎯 PRIORIDAD: Ordenar primero por status usando CASE
    CASE c.status
      WHEN 'pending_human' THEN 1
      WHEN 'pending_response' THEN 2
      WHEN 'active_human' THEN 3
      WHEN 'active_ai' THEN 4
      WHEN 'closed' THEN 5
      ELSE 6
    END ASC,
    -- Tie-breaker: más reciente primero
    c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_prioritized_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_prioritized_conversations TO anon;

