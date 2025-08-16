import { useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'

interface Message {
  id: string
  conversation_id: string
  content: string
  sender_role: 'user' | 'ai' | 'agent'
  agent_email?: string
  agent_name?: string
  responded_by_agent_id?: string
  metadata?: any
  created_at: string
}

interface Conversation {
  id: string
  user_id: string
  username?: string
  phone_number?: string
  status: 'active_ai' | 'active_human' | 'closed' | 'pending_human'
  assigned_agent_id?: string
  assigned_agent_email?: string
  assigned_agent_name?: string
  summary?: string
  channel?: string
  created_at: string
  updated_at: string
}

interface UseRealtimeConversationsProps {
  onMessageInsert?: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
  onMessageDelete?: (messageId: string) => void
  onConversationInsert?: (conversation: Conversation) => void
  onConversationUpdate?: (conversation: Conversation) => void
  onConversationDelete?: (conversationId: string) => void
  userId?: string
}

export function useRealtimeConversations({
  onMessageInsert,
  onMessageUpdate,
  onMessageDelete,
  onConversationInsert,
  onConversationUpdate,
  onConversationDelete,
  userId
}: UseRealtimeConversationsProps) {
  
  const setupRealtimeSubscriptions = useCallback(() => {
    console.log('🔄 [REALTIME] Configurando suscripciones de tiempo real...')
    console.log('🔄 [REALTIME] Callbacks disponibles:', {
      onMessageInsert: !!onMessageInsert,
      onConversationInsert: !!onConversationInsert,
      onConversationUpdate: !!onConversationUpdate,
      userId: userId
    })
    
    let messagesChannel: RealtimeChannel | null = null
    let conversationsChannel: RealtimeChannel | null = null

    try {
      // Suscripción para mensajes
      console.log('📡 [REALTIME] Creando canal de mensajes...')
      messagesChannel = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tb_messages'
          },
          (payload) => {
            console.log('✅ [REALTIME] Nuevo mensaje recibido en tiempo real:', payload.new)
            const newMessage = payload.new as Message
            if (onMessageInsert) {
              console.log('📨 [REALTIME] Ejecutando callback onMessageInsert...')
              onMessageInsert(newMessage)
            } else {
              console.log('⚠️ [REALTIME] Callback onMessageInsert no disponible')
            }
            
            // Mostrar notificación solo si el mensaje no es del usuario actual
            if (newMessage.sender_role !== 'agent' || newMessage.responded_by_agent_id !== userId) {
              toast.success('Nuevo mensaje recibido', {
                description: `${newMessage.sender_role === 'user' ? 'Cliente' : 'IA'}: ${newMessage.content.substring(0, 50)}...`,
                duration: 3000
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tb_messages'
          },
          (payload) => {
            console.log('🔄 [REALTIME] Mensaje actualizado en tiempo real:', payload.new)
            const updatedMessage = payload.new as Message
            if (onMessageUpdate) {
              console.log('📝 [REALTIME] Ejecutando callback onMessageUpdate...')
              onMessageUpdate(updatedMessage)
            } else {
              console.log('⚠️ [REALTIME] Callback onMessageUpdate no disponible')
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'tb_messages'
          },
          (payload) => {
            console.log('🗑️ [REALTIME] Mensaje eliminado en tiempo real:', payload.old)
            const deletedMessage = payload.old as { id: string }
            if (onMessageDelete) {
              console.log('🗑️ [REALTIME] Ejecutando callback onMessageDelete...')
              onMessageDelete(deletedMessage.id)
            } else {
              console.log('⚠️ [REALTIME] Callback onMessageDelete no disponible')
            }
          }
        )

      // Suscripción para conversaciones
      console.log('📡 [REALTIME] Creando canal de conversaciones...')
      conversationsChannel = supabase
        .channel('conversations-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tb_conversations'
          },
          (payload) => {
            console.log('✅ [REALTIME] Nueva conversación recibida en tiempo real:', payload.new)
            const newConversation = payload.new as Conversation
            if (onConversationInsert) {
              console.log('🆕 [REALTIME] Ejecutando callback onConversationInsert...')
              onConversationInsert(newConversation)
            } else {
              console.log('⚠️ [REALTIME] Callback onConversationInsert no disponible')
            }
            
            toast.success('Nueva conversación', {
              description: `Usuario: ${newConversation.username || newConversation.user_id}`,
              duration: 4000
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tb_conversations'
          },
          (payload) => {
            console.log('🔄 [REALTIME] Conversación actualizada en tiempo real:', payload.new)
            const updatedConversation = payload.new as Conversation
            if (onConversationUpdate) {
              console.log('🔄 [REALTIME] Ejecutando callback onConversationUpdate...')
              onConversationUpdate(updatedConversation)
            } else {
              console.log('⚠️ [REALTIME] Callback onConversationUpdate no disponible')
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'tb_conversations'
          },
          (payload) => {
            console.log('🗑️ [REALTIME] Conversación eliminada en tiempo real:', payload.old)
            const deletedConversation = payload.old as { id: string }
            if (onConversationDelete) {
              console.log('🗑️ [REALTIME] Ejecutando callback onConversationDelete...')
              onConversationDelete(deletedConversation.id)
            } else {
              console.log('⚠️ [REALTIME] Callback onConversationDelete no disponible')
            }
          }
        )

      // Suscribirse a los canales
      console.log('📡 [REALTIME] Suscribiendo a canal de mensajes...')
      messagesChannel.subscribe((status) => {
        console.log('📡 [REALTIME] Estado de suscripción de mensajes:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Suscripción a mensajes activa - ESPERANDO MENSAJES')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Error en la suscripción de mensajes')
          toast.error('Error de conexión en tiempo real para mensajes')
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [REALTIME] Canal de mensajes cerrado')
        } else {
          console.log('📡 [REALTIME] Estado de mensajes:', status)
        }
      })

      console.log('📡 [REALTIME] Suscribiendo a canal de conversaciones...')
      conversationsChannel.subscribe((status) => {
        console.log('📡 [REALTIME] Estado de suscripción de conversaciones:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME] Suscripción a conversaciones activa')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [REALTIME] Error en la suscripción de conversaciones')
          toast.error('Error de conexión en tiempo real para conversaciones')
        }
      })

    } catch (error) {
      console.error('❌ [REALTIME] Error configurando suscripciones de tiempo real:', error)
      toast.error('Error configurando tiempo real')
    }

    // Función de limpieza
    return () => {
      console.log('🧹 [REALTIME] Limpiando suscripciones de tiempo real...')
      if (messagesChannel) {
        messagesChannel.unsubscribe()
      }
      if (conversationsChannel) {
        conversationsChannel.unsubscribe()
      }
    }
  }, [onMessageInsert, onMessageUpdate, onMessageDelete, onConversationInsert, onConversationUpdate, onConversationDelete, userId])

  useEffect(() => {
    console.log('🔌 [REALTIME] useEffect ejecutándose, configurando suscripciones...')
    const cleanup = setupRealtimeSubscriptions()
    console.log('🔌 [REALTIME] Suscripciones configuradas, cleanup function creada')
    return cleanup
  }, [setupRealtimeSubscriptions])

  return {
    setupRealtimeSubscriptions
  }
}
