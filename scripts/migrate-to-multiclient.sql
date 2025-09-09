-- =====================================================
-- MIGRACIÓN A SISTEMA MULTI-CLIENTE
-- Script de migración seguro
-- =====================================================

-- Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- identificador único para URLs
    domain TEXT, -- dominio personalizado opcional
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Agregar columna client_id a profiles (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'client_id') THEN
        ALTER TABLE profiles ADD COLUMN client_id UUID REFERENCES clients(id);
    END IF;
END $$;

-- 3. Agregar columna client_id a tb_conversations (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tb_conversations' AND column_name = 'client_id') THEN
        ALTER TABLE tb_conversations ADD COLUMN client_id UUID REFERENCES clients(id);
    END IF;
END $$;

-- 4. Agregar columna client_id a tb_agents (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tb_agents' AND column_name = 'client_id') THEN
        ALTER TABLE tb_agents ADD COLUMN client_id UUID REFERENCES clients(id);
    END IF;
END $$;

-- 5. Agregar columna client_id a message_templates (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'client_id') THEN
        ALTER TABLE message_templates ADD COLUMN client_id UUID REFERENCES clients(id);
    END IF;
END $$;

-- 6. Crear cliente por defecto (Trueblue) si no existe
INSERT INTO clients (id, name, slug, domain, logo_url, primary_color, secondary_color, settings) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000', -- UUID fijo para Trueblue
    'Trueblue',
    'trueblue',
    'trueblue.com',
    NULL,
    '#3B82F6',
    '#1E40AF',
    '{"branding": {"name": "Trueblue", "shortName": "TB"}}'
) ON CONFLICT (slug) DO NOTHING;

-- 7. Actualizar registros existentes para asignarlos al cliente Trueblue
UPDATE profiles SET client_id = '550e8400-e29b-41d4-a716-446655440000' WHERE client_id IS NULL;
UPDATE tb_conversations SET client_id = '550e8400-e29b-41d4-a716-446655440000' WHERE client_id IS NULL;
UPDATE tb_agents SET client_id = '550e8400-e29b-41d4-a716-446655440000' WHERE client_id IS NULL;
UPDATE message_templates SET client_id = '550e8400-e29b-41d4-a716-446655440000' WHERE client_id IS NULL;

-- 8. Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON tb_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON tb_agents(client_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_client_id ON message_templates(client_id);

-- 9. Crear tabla de configuración por cliente
CREATE TABLE IF NOT EXISTS client_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, config_key)
);

-- 10. Insertar configuraciones por defecto para Trueblue
INSERT INTO client_configs (client_id, config_key, config_value) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'branding', '{"name": "Trueblue", "shortName": "TB", "logo": null}'),
('550e8400-e29b-41d4-a716-446655440000', 'features', '{"realtime": true, "templates": true, "agents": true}'),
('550e8400-e29b-41d4-a716-446655440000', 'limits', '{"maxAgents": 50, "maxTemplates": 100, "maxConversations": 10000}')
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 11. Crear función para obtener cliente actual del usuario
CREATE OR REPLACE FUNCTION get_current_user_client_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT client_id 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Crear función para validar acceso a cliente
CREATE OR REPLACE FUNCTION validate_client_access(target_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN target_client_id = get_current_user_client_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Crear función para obtener configuración del cliente
CREATE OR REPLACE FUNCTION get_client_config(config_key TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT config_value 
        FROM client_configs 
        WHERE client_id = get_current_user_client_id() 
        AND config_key = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_configs_updated_at') THEN
        CREATE TRIGGER update_client_configs_updated_at BEFORE UPDATE ON client_configs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 15. Crear vista para información del cliente actual
CREATE OR REPLACE VIEW current_client_info AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.domain,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.settings,
    c.status,
    cc.config_value as branding_config
FROM clients c
LEFT JOIN client_configs cc ON c.id = cc.client_id AND cc.config_key = 'branding'
WHERE c.id = get_current_user_client_id();

-- 16. Crear índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_configs_client_key ON client_configs(client_id, config_key);
CREATE INDEX IF NOT EXISTS idx_conversations_client_status ON tb_conversations(client_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_client_created ON tb_conversations(client_id, created_at DESC);

-- 17. Habilitar RLS en las tablas si no está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_configs ENABLE ROW LEVEL SECURITY;

-- 18. Crear RLS policies para multi-cliente
-- Policy para profiles
DROP POLICY IF EXISTS "Users can only access their own client's profiles" ON profiles;
CREATE POLICY "Users can only access their own client's profiles" ON profiles
    FOR ALL USING (client_id = get_current_user_client_id());

-- Policy para conversations
DROP POLICY IF EXISTS "Users can only access their own client's conversations" ON tb_conversations;
CREATE POLICY "Users can only access their own client's conversations" ON tb_conversations
    FOR ALL USING (client_id = get_current_user_client_id());

-- Policy para agents
DROP POLICY IF EXISTS "Users can only access their own client's agents" ON tb_agents;
CREATE POLICY "Users can only access their own client's agents" ON tb_agents
    FOR ALL USING (client_id = get_current_user_client_id());

-- Policy para message templates
DROP POLICY IF EXISTS "Users can only access their own client's message templates" ON message_templates;
CREATE POLICY "Users can only access their own client's message templates" ON message_templates
    FOR ALL USING (client_id = get_current_user_client_id());

-- Policy para clients (solo admins pueden ver todos los clientes)
DROP POLICY IF EXISTS "Admins can access all clients" ON clients;
CREATE POLICY "Admins can access all clients" ON clients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy para client_configs
DROP POLICY IF EXISTS "Users can only access their own client's configs" ON client_configs;
CREATE POLICY "Users can only access their own client's configs" ON client_configs
    FOR ALL USING (client_id = get_current_user_client_id());

-- 19. Crear función para crear nuevo cliente
CREATE OR REPLACE FUNCTION create_client(
    client_name TEXT,
    client_slug TEXT,
    client_domain TEXT DEFAULT NULL,
    client_logo_url TEXT DEFAULT NULL,
    client_primary_color TEXT DEFAULT '#3B82F6',
    client_secondary_color TEXT DEFAULT '#1E40AF'
)
RETURNS UUID AS $$
DECLARE
    new_client_id UUID;
BEGIN
    -- Verificar que el usuario sea admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can create clients';
    END IF;
    
    -- Crear cliente
    INSERT INTO clients (name, slug, domain, logo_url, primary_color, secondary_color)
    VALUES (client_name, client_slug, client_domain, client_logo_url, client_primary_color, client_secondary_color)
    RETURNING id INTO new_client_id;
    
    -- Crear configuraciones por defecto
    INSERT INTO client_configs (client_id, config_key, config_value) VALUES
    (new_client_id, 'branding', jsonb_build_object('name', client_name, 'shortName', upper(substring(client_name, 1, 2)), 'logo', client_logo_url)),
    (new_client_id, 'features', '{"realtime": true, "templates": true, "agents": true}'),
    (new_client_id, 'limits', '{"maxAgents": 10, "maxTemplates": 50, "maxConversations": 1000}');
    
    RETURN new_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Crear función para asignar usuario a cliente
CREATE OR REPLACE FUNCTION assign_user_to_client(user_email TEXT, client_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    target_client_id UUID;
BEGIN
    -- Verificar que el usuario sea admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can assign users to clients';
    END IF;
    
    -- Obtener client_id
    SELECT id INTO target_client_id FROM clients WHERE slug = client_slug;
    
    IF target_client_id IS NULL THEN
        RAISE EXCEPTION 'Client not found';
    END IF;
    
    -- Actualizar perfil del usuario
    UPDATE profiles 
    SET client_id = target_client_id 
    WHERE email = user_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 21. Comentarios para documentación
COMMENT ON TABLE clients IS 'Tabla principal de clientes para sistema multi-tenant';
COMMENT ON TABLE client_configs IS 'Configuraciones específicas por cliente';
COMMENT ON FUNCTION get_current_user_client_id() IS 'Obtiene el client_id del usuario autenticado';
COMMENT ON FUNCTION validate_client_access(UUID) IS 'Valida si el usuario tiene acceso al cliente especificado';
COMMENT ON FUNCTION get_client_config(TEXT) IS 'Obtiene configuración específica del cliente actual';
COMMENT ON FUNCTION create_client(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Crea un nuevo cliente (solo admins)';
COMMENT ON FUNCTION assign_user_to_client(TEXT, TEXT) IS 'Asigna un usuario a un cliente específico (solo admins)';

-- 22. Verificar que la migración fue exitosa
DO $$
BEGIN
    -- Verificar que el cliente Trueblue existe
    IF NOT EXISTS (SELECT 1 FROM clients WHERE slug = 'trueblue') THEN
        RAISE EXCEPTION 'Cliente Trueblue no fue creado correctamente';
    END IF;
    
    -- Verificar que los perfiles tienen client_id
    IF EXISTS (SELECT 1 FROM profiles WHERE client_id IS NULL) THEN
        RAISE EXCEPTION 'Algunos perfiles no tienen client_id asignado';
    END IF;
    
    -- Verificar que las conversaciones tienen client_id
    IF EXISTS (SELECT 1 FROM tb_conversations WHERE client_id IS NULL) THEN
        RAISE EXCEPTION 'Algunas conversaciones no tienen client_id asignado';
    END IF;
    
    RAISE NOTICE 'Migración a multi-cliente completada exitosamente';
END $$;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
