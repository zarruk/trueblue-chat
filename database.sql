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
