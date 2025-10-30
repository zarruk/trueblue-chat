-- Sistema de Monitoreo y Recuperación Automática de Mensajes Realtime
-- Este archivo contiene las funciones para detectar y recuperar mensajes huérfanos

-- Función para detectar mensajes huérfanos (guardados pero sin evento de Realtime)
CREATE OR REPLACE FUNCTION detect_orphaned_messages()
RETURNS TABLE (
    message_id UUID,
    conversation_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    sender_role TEXT,
    agent_name TEXT,
    responded_by_agent_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.content,
        m.created_at,
        m.sender_role,
        m.agent_name,
        m.responded_by_agent_id
    FROM tb_messages m
    WHERE 
        m.sender_role = 'agent'  -- Solo mensajes de agentes
        AND m.created_at >= NOW() - INTERVAL '2 hours'  -- Últimas 2 horas
        AND NOT EXISTS (
            -- Verificar si existe evento de Realtime para este mensaje
            SELECT 1 
            FROM realtime.messages_2025_10_22 r
            WHERE r.payload::text LIKE '%' || m.id::text || '%'
        )
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para reintentar envío de mensajes fallidos
CREATE OR REPLACE FUNCTION retry_failed_messages()
RETURNS INTEGER AS $$
DECLARE
    message_record RECORD;
    retry_count INTEGER := 0;
    current_date_str TEXT;
BEGIN
    -- Obtener la fecha actual en formato YYYY_MM_DD para la tabla de Realtime
    current_date_str := to_char(NOW(), 'YYYY_MM_DD');
    
    -- Buscar mensajes huérfanos de las últimas 2 horas
    FOR message_record IN 
        SELECT * FROM detect_orphaned_messages()
        WHERE created_at >= NOW() - INTERVAL '2 hours'
    LOOP
        BEGIN
            -- Insertar evento de Realtime manualmente en la tabla del día actual
            EXECUTE format('
                INSERT INTO realtime.messages_%s (
                    topic,
                    event,
                    payload,
                    inserted_at
                ) VALUES (
                    ''public:tb_messages'',
                    ''INSERT'',
                    %L,
                    NOW()
                )',
                current_date_str,
                jsonb_build_object(
                    'id', message_record.message_id,
                    'conversation_id', message_record.conversation_id,
                    'content', message_record.content,
                    'sender_role', message_record.sender_role,
                    'agent_name', message_record.agent_name,
                    'responded_by_agent_id', message_record.responded_by_agent_id,
                    'created_at', message_record.created_at,
                    'updated_at', message_record.created_at
                )
            );
            
            retry_count := retry_count + 1;
            
            -- Log del reintento
            RAISE NOTICE 'Reintentando mensaje: % (Conversación: %)', 
                message_record.message_id, message_record.conversation_id;
                
        EXCEPTION WHEN OTHERS THEN
            -- Log del error pero continuar con otros mensajes
            RAISE WARNING 'Error reintentando mensaje %: %', 
                message_record.message_id, SQLERRM;
        END;
    END LOOP;
    
    RETURN retry_count;
END;
$$ LANGUAGE plpgsql;

-- Función para generar alertas cuando se detectan fallos
CREATE OR REPLACE FUNCTION generate_failure_alerts()
RETURNS VOID AS $$
DECLARE
    orphaned_count INTEGER;
    alert_message TEXT;
BEGIN
    -- Contar mensajes huérfanos
    SELECT COUNT(*) INTO orphaned_count
    FROM detect_orphaned_messages();
    
    IF orphaned_count > 0 THEN
        alert_message := 'ALERTA: ' || orphaned_count || 
            ' mensajes de agentes no se enviaron en las últimas 2 horas. ' ||
            'Se están reintentando automáticamente.';
        
        -- Insertar en tabla de alertas
        INSERT INTO system_alerts (
            alert_type,
            message,
            severity,
            metadata
        ) VALUES (
            'REALTIME_FAILURE',
            alert_message,
            CASE 
                WHEN orphaned_count >= 10 THEN 'CRITICAL'
                WHEN orphaned_count >= 5 THEN 'HIGH'
                WHEN orphaned_count >= 2 THEN 'MEDIUM'
                ELSE 'LOW'
            END,
            jsonb_build_object(
                'orphaned_count', orphaned_count,
                'check_time', NOW()
            )
        );
        
        -- También enviar notificación por pg_notify para sistemas externos
        PERFORM pg_notify('realtime_failure', alert_message);
        
        RAISE NOTICE 'Alerta generada: %', alert_message;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función principal de monitoreo que ejecuta todo el proceso
CREATE OR REPLACE FUNCTION monitor_realtime_health()
RETURNS JSONB AS $$
DECLARE
    retry_count INTEGER := 0;
    orphaned_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Generar alertas si hay mensajes huérfanos
    PERFORM generate_failure_alerts();
    
    -- Contar mensajes huérfanos antes del reintento
    SELECT COUNT(*) INTO orphaned_count
    FROM detect_orphaned_messages();
    
    -- Reintentar mensajes fallidos
    SELECT retry_failed_messages() INTO retry_count;
    
    -- Construir resultado
    result := jsonb_build_object(
        'timestamp', NOW(),
        'orphaned_messages_found', orphaned_count,
        'messages_retried', retry_count,
        'status', CASE 
            WHEN orphaned_count = 0 THEN 'healthy'
            WHEN retry_count > 0 THEN 'recovered'
            ELSE 'failed'
        END
    );
    
    -- Log del resultado
    RAISE NOTICE 'Monitoreo Realtime completado: %', result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas del sistema de monitoreo
CREATE OR REPLACE FUNCTION get_monitoring_stats()
RETURNS TABLE (
    total_alerts INTEGER,
    unresolved_alerts INTEGER,
    critical_alerts INTEGER,
    last_alert_time TIMESTAMP WITH TIME ZONE,
    messages_retried_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_alerts,
        COUNT(*) FILTER (WHERE resolved = FALSE)::INTEGER as unresolved_alerts,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND resolved = FALSE)::INTEGER as critical_alerts,
        MAX(created_at) as last_alert_time,
        COALESCE(SUM((metadata->>'orphaned_count')::INTEGER), 0)::INTEGER as messages_retried_today
    FROM system_alerts
    WHERE created_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON FUNCTION detect_orphaned_messages() IS 'Detecta mensajes de agentes que se guardaron pero no generaron eventos de Realtime';
COMMENT ON FUNCTION retry_failed_messages() IS 'Reintenta enviar mensajes huérfanos generando eventos de Realtime manualmente';
COMMENT ON FUNCTION generate_failure_alerts() IS 'Genera alertas cuando se detectan mensajes huérfanos';
COMMENT ON FUNCTION monitor_realtime_health() IS 'Función principal que ejecuta todo el proceso de monitoreo y recuperación';
COMMENT ON FUNCTION get_monitoring_stats() IS 'Obtiene estadísticas del sistema de monitoreo';


