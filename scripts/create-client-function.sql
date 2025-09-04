-- =====================================================
-- CREAR FUNCIÓN PARA OBTENER CLIENTE
-- =====================================================

-- Crear función para obtener información del cliente
CREATE OR REPLACE FUNCTION get_client_info(client_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  domain TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.domain,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.status,
    c.created_at,
    c.updated_at
  FROM clients c
  WHERE c.id = client_id_param;
END;
$$;

-- Crear función para obtener configuración de branding
CREATE OR REPLACE FUNCTION get_client_branding_config(client_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value TEXT;
  result JSONB;
BEGIN
  SELECT cc.config_value INTO config_value
  FROM client_configs cc
  WHERE cc.client_id = client_id_param 
    AND cc.config_key = 'branding';
  
  IF config_value IS NOT NULL THEN
    BEGIN
      result := config_value::JSONB;
    EXCEPTION WHEN OTHERS THEN
      result := NULL;
    END;
  ELSE
    result := NULL;
  END IF;
  
  RETURN result;
END;
$$;

-- Verificar que las funciones se crearon
SELECT 
  'FUNCIONES CREADAS' as check_name,
  '' as details;

SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname IN ('get_client_info', 'get_client_branding_config');

-- =====================================================
-- FIN DE FUNCIONES
-- =====================================================


