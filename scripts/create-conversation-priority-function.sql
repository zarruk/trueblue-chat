-- Función para calcular la prioridad de las conversaciones
-- Esto asegura que el orden sea consistente entre la BD y el frontend

-- Primero, eliminar la función si existe
DROP FUNCTION IF EXISTS get_conversation_priority(status text, last_message_sender_role text);

-- Crear la función que calcula la prioridad
CREATE OR REPLACE FUNCTION get_conversation_priority(
    status text,
    last_message_sender_role text
) RETURNS integer AS $$
BEGIN
    -- Prioridad 1: pending_human (más urgente)
    IF status = 'pending_human' THEN
        RETURN 1;
    -- Prioridad 2: active_human con último mensaje del usuario
    ELSIF status = 'active_human' AND last_message_sender_role = 'user' THEN
        RETURN 2;
    -- Prioridad 3: pending_response
    ELSIF status = 'pending_response' THEN
        RETURN 3;
    -- Prioridad 4: active_human (ya respondidas)
    ELSIF status = 'active_human' THEN
        RETURN 4;
    -- Prioridad 5: active_ai
    ELSIF status = 'active_ai' THEN
        RETURN 5;
    -- Prioridad 6: closed
    ELSIF status = 'closed' THEN
        RETURN 6;
    -- Prioridad 7: cualquier otro caso
    ELSE
        RETURN 7;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Crear un índice para mejorar el rendimiento del ordenamiento
CREATE INDEX IF NOT EXISTS idx_conversations_priority_order 
ON tb_conversations (
    ((CASE 
        WHEN status = 'pending_human' THEN 1
        WHEN status = 'active_human' THEN 
            CASE WHEN last_message_sender_role = 'user' THEN 2 ELSE 4 END
        WHEN status = 'pending_response' THEN 3
        WHEN status = 'active_ai' THEN 5
        WHEN status = 'closed' THEN 6
        ELSE 7
    END)),
    updated_at DESC
);

-- Verificar que la función se creó correctamente
SELECT 
    status,
    last_message_sender_role,
    get_conversation_priority(status, last_message_sender_role) as priority
FROM (
    VALUES 
        ('pending_human', NULL),
        ('active_human', 'user'),
        ('active_human', 'agent'),
        ('pending_response', NULL),
        ('active_ai', NULL),
        ('closed', NULL)
) AS test_cases(status, last_message_sender_role)
ORDER BY priority;
