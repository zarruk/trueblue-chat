-- Script para agregar el campo channel a la tabla tb_conversations
-- Este campo permitirá identificar el canal de origen de la conversación

-- Agregar el campo channel si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tb_conversations' 
        AND column_name = 'channel'
    ) THEN
        ALTER TABLE tb_conversations ADD COLUMN channel TEXT DEFAULT 'web';
        RAISE NOTICE 'Columna channel agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna channel ya existe';
    END IF;
END $$;

-- Crear un índice para mejorar el rendimiento de consultas por canal
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON tb_conversations(channel);

-- Actualizar conversaciones existentes basándose en la información disponible
UPDATE tb_conversations 
SET channel = CASE 
  WHEN phone_number IS NOT NULL THEN 'whatsapp'
  WHEN username LIKE '@%' THEN 'telegram'
  ELSE 'web'
END
WHERE channel = 'web' OR channel IS NULL;

-- Comentario sobre los valores posibles del campo channel
COMMENT ON COLUMN tb_conversations.channel IS 'Canal de origen de la conversación: web, whatsapp, telegram, sms, etc.';

-- Verificar que la columna se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tb_conversations' 
AND column_name = 'channel';
