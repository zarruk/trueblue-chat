-- =====================================================
-- CREAR FUNCIÓN PARA ASIGNAR CLIENT_ID CORRECTO
-- =====================================================

-- Función para obtener el client_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_current_user_client_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_client_id UUID;
BEGIN
  -- Obtener el client_id del perfil del usuario autenticado
  SELECT client_id INTO user_client_id
  FROM profiles
  WHERE id = auth.uid();
  
  -- Si no se encuentra, usar el cliente por defecto (Trueblue)
  IF user_client_id IS NULL THEN
    user_client_id := '550e8400-e29b-41d4-a716-446655440000';
  END IF;
  
  RETURN user_client_id;
END;
$$;

-- Función para asignar client_id a conversaciones
CREATE OR REPLACE FUNCTION assign_client_to_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si no se proporciona client_id, asignar el del usuario actual
  IF NEW.client_id IS NULL THEN
    NEW.client_id := get_current_user_client_id();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para asignar client_id automáticamente
DROP TRIGGER IF EXISTS auto_assign_client_to_conversation ON tb_conversations;
CREATE TRIGGER auto_assign_client_to_conversation
  BEFORE INSERT ON tb_conversations
  FOR EACH ROW
  EXECUTE FUNCTION assign_client_to_conversation();

-- Función para asignar client_id a mensajes
CREATE OR REPLACE FUNCTION assign_client_to_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si no se proporciona client_id, obtenerlo de la conversación
  IF NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM tb_conversations
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para asignar client_id automáticamente a mensajes
DROP TRIGGER IF EXISTS auto_assign_client_to_message ON tb_messages;
CREATE TRIGGER auto_assign_client_to_message
  BEFORE INSERT ON tb_messages
  FOR EACH ROW
  EXECUTE FUNCTION assign_client_to_message();

-- Verificar que las funciones se crearon
SELECT 
  'FUNCIONES CREADAS' as check_name,
  '' as details;

SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname IN ('get_current_user_client_id', 'assign_client_to_conversation', 'assign_client_to_message');

-- Verificar triggers
SELECT 
  'TRIGGERS CREADOS' as check_name,
  '' as details;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('auto_assign_client_to_conversation', 'auto_assign_client_to_message');

-- =====================================================
-- FIN DE FUNCIONES
-- =====================================================


