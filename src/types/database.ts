export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string | null
          email: string
          name: string
          role: 'admin' | 'agent' | 'ai'
          created_at: string
          updated_at: string
          status: string
          created_by: string | null
          created_by_name: string | null
          created_by_email: string | null
          client_id: string // Nuevo campo
        }
        Insert: {
          id: string
          user_id?: string | null
          email: string
          name: string
          role?: 'admin' | 'agent' | 'ai'
          created_at?: string
          updated_at?: string
          status?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_email?: string | null
          client_id: string // Nuevo campo
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          name?: string
          role?: 'admin' | 'agent' | 'ai'
          created_at?: string
          updated_at?: string
          status?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_email?: string | null
          client_id?: string // Nuevo campo
        }
      }
      tb_conversations: {
        Row: {
          id: string
          user_id: string
          username: string | null
          status: 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'
          created_at: string
          updated_at: string
          assigned_agent_id: string | null
          summary: string | null
          assigned_agent_name: string | null
          assigned_agent_email: string | null
          phone_number: string | null
          channel: string
          client_id: string // Nuevo campo
        }
        Insert: {
          id?: string
          user_id: string
          username?: string | null
          status?: 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'
          created_at?: string
          updated_at?: string
          assigned_agent_id?: string | null
          summary?: string | null
          assigned_agent_name?: string | null
          assigned_agent_email?: string | null
          phone_number?: string | null
          channel: string
          client_id: string // Nuevo campo
        }
        Update: {
          id?: string
          user_id?: string
          username?: string | null
          status?: 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'
          created_at?: string
          updated_at?: string
          assigned_agent_id?: string | null
          summary?: string | null
          assigned_agent_name?: string | null
          assigned_agent_email?: string | null
          phone_number?: string | null
          channel?: string
          client_id?: string // Nuevo campo
        }
      }
      tb_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_role: 'user' | 'ai' | 'agent'
          content: string
          created_at: string
          metadata: any | null
          message_id: string | null
          responded_by_agent_id: string | null
          agent_name: string | null
          agent_email: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_role: 'user' | 'ai' | 'agent'
          content: string
          created_at?: string
          metadata?: any | null
          message_id?: string | null
          responded_by_agent_id?: string | null
          agent_name?: string | null
          agent_email?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_role?: 'user' | 'ai' | 'agent'
          content?: string
          created_at?: string
          metadata?: any | null
          message_id?: string | null
          responded_by_agent_id?: string | null
          agent_name?: string | null
          agent_email?: string | null
        }
      }
      tb_agents: {
        Row: {
          id: string
          email: string
          name: string
          role: string | null
          telefono: string | null
          created_at: string | null
          client_id: string // Nuevo campo
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string | null
          telefono?: string | null
          created_at?: string | null
          client_id: string // Nuevo campo
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string | null
          telefono?: string | null
          created_at?: string | null
          client_id?: string // Nuevo campo
        }
      }
      tb_message_templates: {
        Row: {
          id: string
          name: string
          message: string
          category: string
          created_by: string | null
          created_at: string
          updated_at: string
          client_id: string // Nuevo campo
        }
        Insert: {
          id?: string
          name: string
          message: string
          category: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          client_id: string // Nuevo campo
        }
        Update: {
          id?: string
          name?: string
          message?: string
          category?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          client_id?: string // Nuevo campo
        }
      }
      // Nuevas tablas
      clients: {
        Row: {
          id: string
          name: string
          slug: string
          domain: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          settings: any
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          domain?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          settings?: any
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          domain?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          settings?: any
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      client_configs: {
        Row: {
          id: string
          client_id: string
          config_key: string
          config_value: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          config_key: string
          config_value: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          config_key?: string
          config_value?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      current_client_info: {
        Row: {
          id: string
          name: string
          slug: string
          domain: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          settings: any
          status: string
          branding_config: any | null
        }
      }
    }
    Functions: {
      get_current_user_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_client_access: {
        Args: {
          target_client_id: string
        }
        Returns: boolean
      }
      get_client_config: {
        Args: {
          config_key: string
        }
        Returns: any
      }
      create_client: {
        Args: {
          client_name: string
          client_slug: string
          client_domain?: string
          client_logo_url?: string
          client_primary_color?: string
          client_secondary_color?: string
        }
        Returns: string
      }
      assign_user_to_client: {
        Args: {
          user_email: string
          client_slug: string
        }
        Returns: boolean
      }
    }
  }
}

// Tipos adicionales para el sistema multi-cliente
export interface Client {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  settings: any
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface ClientConfig {
  id: string
  client_id: string
  config_key: string
  config_value: any
  created_at: string
  updated_at: string
}

export interface CurrentClientInfo {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  settings: any
  status: string
  branding_config: {
    name: string
    shortName: string
    logo: string | null
  } | null
}

// Tipos para el sistema multi-cliente
export interface Profile {
  id: string
  user_id: string | null
  email: string
  name: string
  role: 'admin' | 'agent' | 'ai'
  created_at: string
  updated_at: string
  status: string
  created_by: string | null
  created_by_name: string | null
  created_by_email: string | null
  client_id: string
}

export interface Conversation {
  id: string
  user_id: string
  username: string | null
  status: 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'
  created_at: string
  updated_at: string
  assigned_agent_id: string | null
  summary: string | null
  assigned_agent_name: string | null
  assigned_agent_email: string | null
  phone_number: string | null
  channel: string
  client_id: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_role: 'user' | 'ai' | 'agent'
  content: string
  created_at: string
  updated_at: string
  metadata: any
  responded_by_agent_id: string | null
  client_id: string
}

export interface Agent {
  id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
  updated_at: string
  client_id: string
}

export interface MessageTemplate {
  id: string
  name: string
  message: string
  created_at: string
  updated_at: string
  created_by: string
  client_id: string
}