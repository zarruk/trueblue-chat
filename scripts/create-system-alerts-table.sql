-- Crear tabla para alertas del sistema de monitoreo de Realtime
-- Esta tabla almacena alertas cuando se detectan mensajes huérfanos

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Comentarios para documentación
COMMENT ON TABLE system_alerts IS 'Tabla para almacenar alertas del sistema de monitoreo de Realtime';
COMMENT ON COLUMN system_alerts.alert_type IS 'Tipo de alerta (REALTIME_FAILURE, etc.)';
COMMENT ON COLUMN system_alerts.message IS 'Mensaje descriptivo de la alerta';
COMMENT ON COLUMN system_alerts.severity IS 'Nivel de severidad: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN system_alerts.resolved IS 'Indica si la alerta ha sido resuelta';
COMMENT ON COLUMN system_alerts.metadata IS 'Datos adicionales en formato JSON';


