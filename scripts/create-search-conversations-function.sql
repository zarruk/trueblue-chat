-- Función para buscar conversaciones con texto y mantener la priorización
-- Esta función busca en username, phone_number y user_id

DROP FUNCTION IF EXISTS search_conversations_ordered;

CREATE OR REPLACE FUNCTION search_conversations_ordered(
    p_search_term text DEFAULT NULL,
    p_client_id uuid DEFAULT NULL,
    p_user_role text DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50
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
    created_at timestamptz,
    updated_at timestamptz,
    client_id uuid,
    last_message_sender_role text,
    last_message_at timestamptz,
    last_message_content text,
    conversation_priority integer
) AS $$
BEGIN
    RETURN QUERY
    WITH conversations_with_last_message AS (
        SELECT DISTINCT ON (c.id)
            c.*,
            m.sender_role as last_msg_sender_role,
            m.created_at as last_msg_at,
            m.content as last_msg_content
        FROM tb_conversations c
        LEFT JOIN tb_messages m ON c.id = m.conversation_id
        WHERE 
            -- Filtro por cliente si se proporciona
            (p_client_id IS NULL OR c.client_id = p_client_id)
            -- Filtro de búsqueda
            AND (
                p_search_term IS NULL 
                OR p_search_term = ''
                OR (
                    -- Búsqueda insensible a mayúsculas/minúsculas
                    c.username ILIKE '%' || p_search_term || '%'
                    OR c.phone_number ILIKE '%' || p_search_term || '%'
                    OR c.user_id ILIKE '%' || p_search_term || '%'
                    -- También buscar en el contenido del último mensaje
                    OR EXISTS (
                        SELECT 1 FROM tb_messages msg 
                        WHERE msg.conversation_id = c.id 
                        AND msg.content ILIKE '%' || p_search_term || '%'
                        LIMIT 1
                    )
                )
            )
            -- Filtros adicionales según el rol del usuario
            AND (
                p_user_role = 'admin' 
                OR p_user_role IS NULL
                OR (
                    -- Si no es admin, mostrar solo asignadas o pendientes
                    c.assigned_agent_id = p_user_id
                    OR c.status = 'pending_human'
                    OR c.status = 'active_ai'
                )
            )
        ORDER BY c.id, m.created_at DESC
    )
    SELECT 
        cwm.id,
        cwm.user_id,
        cwm.username,
        cwm.phone_number,
        cwm.status,
        cwm.assigned_agent_id,
        cwm.assigned_agent_email,
        cwm.assigned_agent_name,
        cwm.summary,
        cwm.channel,
        cwm.created_at,
        cwm.updated_at,
        cwm.client_id,
        cwm.last_msg_sender_role,
        cwm.last_msg_at,
        cwm.last_msg_content,
        -- Calcular prioridad
        CASE 
            WHEN cwm.status = 'pending_human' THEN 1
            WHEN cwm.status = 'active_human' AND cwm.last_msg_sender_role = 'user' THEN 2
            WHEN cwm.status = 'pending_response' THEN 3
            WHEN cwm.status = 'active_human' THEN 4
            WHEN cwm.status = 'active_ai' THEN 5
            WHEN cwm.status = 'closed' THEN 6
            ELSE 7
        END as conversation_priority
    FROM conversations_with_last_message cwm
    ORDER BY 
        -- Primero por prioridad
        CASE 
            WHEN cwm.status = 'pending_human' THEN 1
            WHEN cwm.status = 'active_human' AND cwm.last_msg_sender_role = 'user' THEN 2
            WHEN cwm.status = 'pending_response' THEN 3
            WHEN cwm.status = 'active_human' THEN 4
            WHEN cwm.status = 'active_ai' THEN 5
            WHEN cwm.status = 'closed' THEN 6
            ELSE 7
        END,
        -- Luego por fecha de actualización (más reciente primero)
        cwm.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para que los usuarios autenticados puedan ejecutar la función
GRANT EXECUTE ON FUNCTION search_conversations_ordered TO authenticated;

-- Crear índice para mejorar la búsqueda de texto
CREATE INDEX IF NOT EXISTS idx_conversations_search_text 
ON tb_conversations USING gin(
    to_tsvector('spanish', coalesce(username, '') || ' ' || coalesce(phone_number, '') || ' ' || user_id)
);

-- Verificar que la función funciona
SELECT 'Función search_conversations_ordered creada exitosamente' as resultado;



