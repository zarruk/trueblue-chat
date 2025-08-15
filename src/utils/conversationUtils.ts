
import { ConversationWithMessages, Message } from '@/types/database';

/**
 * Ordena los mensajes cronológicamente (más antiguos primero, más recientes al final)
 * Para usar en el ChatWindow donde queremos mostrar la conversación en orden temporal
 */
export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Obtiene el último mensaje (más reciente) de una conversación
 * Para usar en la lista de conversaciones donde queremos mostrar el último mensaje
 */
export function getLastMessage(messages: Message[]): Message | null {
  if (messages.length === 0) return null;
  
  // Ordenar por fecha de creación y tomar el último
  const sortedMessages = sortMessagesChronologically(messages);
  return sortedMessages[sortedMessages.length - 1];
}

/**
 * Obtiene el texto del último mensaje para mostrar en la lista de conversaciones
 */
export function getLastMessageText(messages: Message[], maxLength: number = 50): string {
  const lastMessage = getLastMessage(messages);
  
  if (!lastMessage) return 'Sin mensajes';
  
  return lastMessage.content.length > maxLength 
    ? `${lastMessage.content.substring(0, maxLength)}...` 
    : lastMessage.content;
}

/**
 * Verifica si hay mensajes sin leer del usuario
 */
export function hasUnreadUserMessages(conversation: ConversationWithMessages): boolean {
  if (!conversation.messages || conversation.messages.length === 0) return false;
  
  // Ordenar mensajes por fecha de creación
  const sortedMessages = sortMessagesChronologically(conversation.messages);
  const lastMessage = sortedMessages[sortedMessages.length - 1];
  
  // Si el último mensaje es del usuario y no hay respuesta posterior, está sin leer
  return lastMessage.sender_role === 'user';
}

/**
 * Obtiene el número de mensajes sin leer
 */
export function getUnreadMessageCount(conversation: ConversationWithMessages): number {
  if (!conversation.messages || conversation.messages.length === 0) return 0;
  
  const sortedMessages = sortMessagesChronologically(conversation.messages);
  let unreadCount = 0;
  
  // Contar mensajes del usuario que no tienen respuesta posterior
  for (let i = 0; i < sortedMessages.length; i++) {
    const message = sortedMessages[i];
    if (message.sender_role === 'user') {
      // Verificar si hay respuesta posterior
      const hasResponseAfter = sortedMessages.slice(i + 1).some(m => 
        m.sender_role === 'ai' || m.sender_role === 'agent'
      );
      if (!hasResponseAfter) {
        unreadCount++;
      }
    }
  }
  
  return unreadCount;
}
