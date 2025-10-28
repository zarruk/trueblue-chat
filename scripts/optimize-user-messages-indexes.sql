-- Índices optimizados para consultas de historial de mensajes por usuario
-- Estos índices aceleran las consultas que obtienen mensajes por user_id + client_id

-- Crear índice compuesto para consultas de mensajes por usuario y cliente
-- Esto optimiza la consulta JOIN entre tb_messages y tb_conversations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_client_created 
ON tb_conversations (user_id, client_id, created_at DESC);

-- Crear índice para mensajes ordenados por fecha (ya existe pero verificamos)
-- Este índice es crucial para el ordenamiento cronológico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at_conversation 
ON tb_messages (conversation_id, created_at ASC);

-- Índice adicional para mejorar las consultas JOIN entre mensajes y conversaciones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created 
ON tb_messages (conversation_id, created_at DESC);

-- Comentarios explicativos
COMMENT ON INDEX idx_conversations_user_client_created IS 
'Optimiza consultas de historial por user_id + client_id ordenadas por fecha';

COMMENT ON INDEX idx_messages_created_at_conversation IS 
'Optimiza ordenamiento cronológico ascendente de mensajes por conversación';

COMMENT ON INDEX idx_messages_conversation_created IS 
'Optimiza paginación hacia atrás (mensajes más antiguos) en scroll infinito';

-- Verificar que los índices existentes están bien optimizados
-- Mostrar información de los índices relacionados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('tb_messages', 'tb_conversations')
    AND (indexname LIKE '%user%' 
         OR indexname LIKE '%client%' 
         OR indexname LIKE '%created%'
         OR indexname LIKE '%conversation%')
ORDER BY tablename, indexname;
