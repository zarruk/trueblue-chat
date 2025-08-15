import { Database } from '@/integrations/supabase/types';

export type ConversationStatus = Database['public']['Enums']['conversation_status'];
export type SenderRole = Database['public']['Enums']['message_sender_role'];
export type AppRole = Database['public']['Enums']['app_role'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Conversation = Database['public']['Tables']['tb_conversations']['Row'];
export type Message = Database['public']['Tables']['tb_messages']['Row'];

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  assigned_agent?: Profile;
}