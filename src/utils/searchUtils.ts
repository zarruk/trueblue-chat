
import { ConversationWithMessages } from '@/types/database';

export function filterConversationsBySearch(
  conversations: ConversationWithMessages[],
  searchTerm: string
): ConversationWithMessages[] {
  if (!searchTerm.trim()) {
    return conversations;
  }

  const term = searchTerm.toLowerCase().trim();

  return conversations.filter(conversation => {
    // Buscar por username
    const usernameMatch = conversation.username?.toLowerCase().includes(term);
    
    // Buscar por user_id (como fallback si no hay username)
    const userIdMatch = conversation.user_id?.toLowerCase().includes(term);
    
    // Buscar por número de teléfono
    const phoneMatch = conversation.phone_number?.toLowerCase().includes(term);

    return usernameMatch || userIdMatch || phoneMatch;
  });
}
