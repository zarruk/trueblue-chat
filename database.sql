-- TrueBlue Chat Management Database Schema
-- Este archivo contiene la estructura completa de la base de datos para Supabase

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tipos enumerados
CREATE TYPE app_role AS ENUM ('admin', 'agent', 'ai');
CREATE TYPE conversation_status AS ENUM ('active_ai', 'active_human', 'closed', 'pending_human');
CREATE TYPE message_sender_role AS ENUM ('user', 'ai', 'agent');

-- Tabla de perfiles de usuario
CREATE TABLE profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role app_role DEFAULT 'agent',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_by_email TEXT,
    created_by_name TEXT
);

-- Tabla de agentes
CREATE TABLE tb_agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'agent',
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de conversaciones
CREATE TABLE tb_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT,
    phone_number TEXT,
    status conversation_status DEFAULT 'pending_human',
    assigned_agent_id UUID REFERENCES profiles(id),
    assigned_agent_email TEXT,
    assigned_agent_name TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE tb_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES tb_conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_role message_sender_role NOT NULL,
    agent_email TEXT,
    agent_name TEXT,
    responded_by_agent_id UUID REFERENCES profiles(id),
    message_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cola de mensajes
CREATE TABLE tb_queue_messages (
    id SERIAL PRIMARY KEY,
    chat_id TEXT,
    message_id TEXT,
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_conversations_user_id ON tb_conversations(user_id);
CREATE INDEX idx_conversations_status ON tb_conversations(status);
CREATE INDEX idx_conversations_assigned_agent_id ON tb_conversations(assigned_agent_id);
CREATE INDEX idx_messages_conversation_id ON tb_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON tb_messages(created_at);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON tb_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener el perfil del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS profiles AS $$
BEGIN
    RETURN (
        SELECT * FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar Realtime para las tablas necesarias
ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS app_role AS $$
BEGIN
    RETURN (
        SELECT role FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin' FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el estado del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_status()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT status FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario está activo
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT status = 'active' FROM profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_queue_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para tb_agents
CREATE POLICY "Everyone can view agents" ON tb_agents
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert agents" ON tb_agents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can update agents" ON tb_agents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete agents" ON tb_agents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para tb_conversations
CREATE POLICY "Users can view conversations they're assigned to" ON tb_conversations
    FOR SELECT USING (
        assigned_agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all conversations" ON tb_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update conversations they're assigned to" ON tb_conversations
    FOR UPDATE USING (
        assigned_agent_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update all conversations" ON tb_conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para tb_messages
CREATE POLICY "Users can view messages from their conversations" ON tb_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM tb_conversations 
            WHERE assigned_agent_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can view all messages" ON tb_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert messages to their conversations" ON tb_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM tb_conversations 
            WHERE assigned_agent_id IN (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can insert messages to any conversation" ON tb_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para tb_queue_messages
CREATE POLICY "Everyone can view queue messages" ON tb_queue_messages
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert queue messages" ON tb_queue_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Crear vista para conversaciones con mensajes
CREATE VIEW conversations_with_messages AS
SELECT 
    c.*,
    json_agg(
        json_build_object(
            'id', m.id,
            'content', m.content,
            'sender_role', m.sender_role,
            'agent_email', m.agent_email,
            'agent_name', m.agent_name,
            'created_at', m.created_at,
            'metadata', m.metadata
        ) ORDER BY m.created_at
    ) FILTER (WHERE m.id IS NOT NULL) as messages
FROM tb_conversations c
LEFT JOIN tb_messages m ON c.id = m.conversation_id
GROUP BY c.id;

-- Crear vista para estadísticas de agentes
CREATE VIEW agent_stats AS
SELECT 
    p.id,
    p.name,
    p.email,
    p.role,
    p.status,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN c.status = 'active_human' THEN c.id END) as active_conversations,
    COUNT(DISTINCT CASE WHEN c.status = 'closed' THEN c.id END) as closed_conversations,
    COUNT(m.id) as total_messages,
    MAX(c.updated_at) as last_activity
FROM profiles p
LEFT JOIN tb_conversations c ON p.id = c.assigned_agent_id
LEFT JOIN tb_messages m ON c.id = m.conversation_id AND m.responded_by_agent_id = p.id
WHERE p.role IN ('admin', 'agent')
GROUP BY p.id, p.name, p.email, p.role, p.status;

-- Insertar usuario admin por defecto (cambiar credenciales en producción)
INSERT INTO profiles (email, name, role, status, created_at, updated_at)
VALUES (
    'admin@trueblue.com',
    'Administrador',
    'admin',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Comentarios para documentar la estructura
COMMENT ON TABLE profiles IS 'Perfiles de usuario del sistema con roles y estados';
COMMENT ON TABLE tb_agents IS 'Agentes del sistema de soporte';
COMMENT ON TABLE tb_conversations IS 'Conversaciones de chat entre usuarios y agentes';
COMMENT ON TABLE tb_messages IS 'Mensajes individuales dentro de las conversaciones';
COMMENT ON TABLE tb_queue_messages IS 'Cola de mensajes pendientes de procesamiento';

COMMENT ON COLUMN profiles.role IS 'Rol del usuario: admin, agent, o ai';
COMMENT ON COLUMN profiles.status IS 'Estado del usuario: pending, active, inactive, suspended';
COMMENT ON COLUMN tb_conversations.status IS 'Estado de la conversación: active_ai, active_human, closed, pending_human';
COMMENT ON COLUMN tb_messages.sender_role IS 'Rol del remitente: user, ai, o agent';

-- =====================================================
-- MIGRACIÓN A SISTEMA MULTI-CLIENTE
-- =====================================================

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

-- 2. Agregar columna client_id a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);

-- 3. Agregar columna client_id a tb_conversations
ALTER TABLE tb_conversations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON tb_conversations(client_id);

-- 4. Agregar columna client_id a tb_agents
ALTER TABLE tb_agents ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON tb_agents(client_id);

-- 5. Agregar columna client_id a message_templates
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_message_templates_client_id ON message_templates(client_id);

-- 6. Crear cliente por defecto (Trueblue)
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

-- 8. Hacer client_id NOT NULL después de asignar valores
ALTER TABLE profiles ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE tb_conversations ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE tb_agents ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE message_templates ALTER COLUMN client_id SET NOT NULL;

-- 9. Crear RLS policies para multi-cliente
-- Policy para profiles
CREATE POLICY "Users can only access their own client's profiles" ON profiles
    FOR ALL USING (client_id = (
        SELECT client_id FROM profiles WHERE id = auth.uid()
    ));

-- Policy para conversations
CREATE POLICY "Users can only access their own client's conversations" ON tb_conversations
    FOR ALL USING (client_id = (
        SELECT client_id FROM profiles WHERE id = auth.uid()
    ));

-- Policy para agents
CREATE POLICY "Users can only access their own client's agents" ON tb_agents
    FOR ALL USING (client_id = (
        SELECT client_id FROM profiles WHERE id = auth.uid()
    ));

-- Policy para message templates
CREATE POLICY "Users can only access their own client's message templates" ON message_templates
    FOR ALL USING (client_id = (
        SELECT client_id FROM profiles WHERE id = auth.uid()
    ));

-- 10. Crear función para obtener cliente actual del usuario
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

-- 11. Crear función para validar acceso a cliente
CREATE OR REPLACE FUNCTION validate_client_access(target_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN target_client_id = get_current_user_client_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Crear índices compuestos para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_client_status ON tb_conversations(client_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_client_created ON tb_conversations(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_client ON tb_messages(conversation_id) 
    WHERE conversation_id IN (SELECT id FROM tb_conversations WHERE client_id = get_current_user_client_id());

-- 13. Crear tabla de configuración por cliente
CREATE TABLE IF NOT EXISTS client_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, config_key)
);

-- 14. Insertar configuraciones por defecto para Trueblue
INSERT INTO client_configs (client_id, config_key, config_value) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'branding', '{"name": "Trueblue", "shortName": "TB", "logo": null}'),
('550e8400-e29b-41d4-a716-446655440000', 'features', '{"realtime": true, "templates": true, "agents": true}'),
('550e8400-e29b-41d4-a716-446655440000', 'limits', '{"maxAgents": 50, "maxTemplates": 100, "maxConversations": 10000}')
ON CONFLICT (client_id, config_key) DO NOTHING;

-- 15. Crear función para obtener configuración del cliente
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

-- 16. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_configs_updated_at BEFORE UPDATE ON client_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. Crear vista para información del cliente actual
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

-- 18. Crear función para crear nuevo cliente
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
    -- Verificar que el usuario sea super admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super admins can create clients';
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

-- 19. Crear función para asignar usuario a cliente
CREATE OR REPLACE FUNCTION assign_user_to_client(user_email TEXT, client_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    target_client_id UUID;
BEGIN
    -- Verificar que el usuario sea super admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super admins can assign users to clients';
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

-- 20. Crear índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_configs_client_key ON client_configs(client_id, config_key);

-- 21. Comentarios para documentación
COMMENT ON TABLE clients IS 'Tabla principal de clientes para sistema multi-tenant';
COMMENT ON TABLE client_configs IS 'Configuraciones específicas por cliente';
COMMENT ON FUNCTION get_current_user_client_id() IS 'Obtiene el client_id del usuario autenticado';
COMMENT ON FUNCTION validate_client_access(UUID) IS 'Valida si el usuario tiene acceso al cliente especificado';
COMMENT ON FUNCTION get_client_config(TEXT) IS 'Obtiene configuración específica del cliente actual';
COMMENT ON FUNCTION create_client(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Crea un nuevo cliente (solo super admins)';
COMMENT ON FUNCTION assign_user_to_client(TEXT, TEXT) IS 'Asigna un usuario a un cliente específico (solo super admins)';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
