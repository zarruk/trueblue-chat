import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
// Notificaciones deshabilitadas
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const

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
  clientId?: string
}

export function useRealtimeConversations({
  onMessageInsert,
  onMessageUpdate,
  onMessageDelete,
  onConversationInsert,
  onConversationUpdate,
  onConversationDelete,
  userId,
  clientId
}: UseRealtimeConversationsProps) {
  
  // Usar useRef para evitar loop infinito
  const callbacksRef = useRef({
    onMessageInsert,
    onMessageUpdate,
    onMessageDelete,
    onConversationInsert,
    onConversationUpdate,
    onConversationDelete,
    userId
  })

  // Actualizar ref cuando cambien los callbacks
  useEffect(() => {
    callbacksRef.current = {
      onMessageInsert,
      onMessageUpdate,
      onMessageDelete,
      onConversationInsert,
      onConversationUpdate,
      onConversationDelete,
      userId
    }
  }, [onMessageInsert, onMessageUpdate, onMessageDelete, onConversationInsert, onConversationUpdate, onConversationDelete, userId])

  const setupRealtimeSubscriptions = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 [REALTIME] Configurando suscripciones (DEV)...', {
        hasOnMessageInsert: !!callbacksRef.current.onMessageInsert,
        hasOnConversationUpdate: !!callbacksRef.current.onConversationUpdate,
        mode: import.meta.env.MODE
      })
    }
    
    let messagesChannel: RealtimeChannel | null = null
    let conversationsChannel: RealtimeChannel | null = null

    try {
      // Suscripción para mensajes
      if (import.meta.env.DEV) console.log('📡 [REALTIME] Creando canal de mensajes...')
      messagesChannel = supabase
        .channel('messages-changes', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tb_messages'
          },
          async (payload) => {
            if (import.meta.env.DEV) console.log('✅ [REALTIME] Insert payload:', payload)
            const newMessage = payload.new as Message & { client_id?: string }

            // --- Debugging con gating DEV ---
            if (import.meta.env.DEV) {
              console.log(`[REALTIME DEBUG] Hook client_id: ${clientId}`)
              console.log(`[REALTIME DEBUG] Message client_id: ${newMessage.client_id}`)
            }

            // Guardar por clientId si está disponible; si no, intentar inferirlo por la conversación
            if (clientId) {
              if (newMessage.client_id && newMessage.client_id !== clientId) {
                if (import.meta.env.DEV) console.log('[REALTIME DEBUG] REJECTED por client_id (mensaje)')
                return
              }
              if (!newMessage.client_id && newMessage.conversation_id) {
                if (import.meta.env.DEV) console.log('[REALTIME DEBUG] Buscando client_id por conversación...')
                try {
                  const { data: conv } = await supabase
                    .from('tb_conversations')
                    .select('client_id')
                    .eq('id', newMessage.conversation_id)
                    .maybeSingle()
                  if (import.meta.env.DEV) console.log('[REALTIME DEBUG] conv.client_id:', (conv as any)?.client_id)
                  const convClientId = (conv as any)?.client_id as string | undefined
                  if (convClientId && convClientId !== clientId) {
                    if (import.meta.env.DEV) console.log('[REALTIME DEBUG] REJECTED por client_id (conversación)')
                    return
                  }
                } catch (e) {
                  if (import.meta.env.DEV) console.warn('[REALTIME DEBUG] Error verificando client_id del mensaje:', e)
                }
              }
            }
            if (import.meta.env.DEV) console.log('[REALTIME DEBUG] PASSED: client_id OK, ejecutando callback')
            // --- End Intensive Debugging ---

            if (callbacksRef.current.onMessageInsert) {
              if (import.meta.env.DEV) console.log('📨 [REALTIME] Ejecutando onMessageInsert...')
              callbacksRef.current.onMessageInsert(newMessage)
            } else {
              if (import.meta.env.DEV) console.log('⚠️ [REALTIME] onMessageInsert no disponible')
            }
            
            if (newMessage.sender_role !== 'agent' || newMessage.responded_by_agent_id !== callbacksRef.current.userId) {
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
          async (payload) => {
            if (import.meta.env.DEV) console.log('🔄 [REALTIME] Mensaje actualizado:', payload.new)
            const updatedMessage = payload.new as Message & { client_id?: string }
            if (clientId) {
              if (updatedMessage.client_id && updatedMessage.client_id !== clientId) return
            }
            if (callbacksRef.current.onMessageUpdate) {
              if (import.meta.env.DEV) console.log('📝 [REALTIME] Ejecutando onMessageUpdate...')
              callbacksRef.current.onMessageUpdate(updatedMessage)
            } else {
              if (import.meta.env.DEV) console.log('⚠️ [REALTIME] onMessageUpdate no disponible')
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
            if (import.meta.env.DEV) console.log('🗑️ [REALTIME] Mensaje eliminado:', payload.old)
            const deletedMessage = payload.old as { id: string }
            if (callbacksRef.current.onMessageDelete) {
              if (import.meta.env.DEV) console.log('🗑️ [REALTIME] Ejecutando onMessageDelete...')
              callbacksRef.current.onMessageDelete(deletedMessage.id)
            } else {
              if (import.meta.env.DEV) console.log('⚠️ [REALTIME] onMessageDelete no disponible')
            }
          }
        )

      // Suscripción para conversaciones
      if (import.meta.env.DEV) console.log('📡 [REALTIME] Creando canal de conversaciones...')
      conversationsChannel = supabase
        .channel('conversations-changes', {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tb_conversations'
          },
          (payload) => {
            if (import.meta.env.DEV) console.log('✅ [REALTIME] Nueva conversación:', payload.new)
            const newConversation = payload.new as Conversation & { client_id?: string }
            if (clientId && newConversation.client_id && newConversation.client_id !== clientId) {
              if (import.meta.env.DEV) console.log('[REALTIME DEBUG] REJECTED por client_id (conversación)')
              return
            }
            if (callbacksRef.current.onConversationInsert) {
              if (import.meta.env.DEV) console.log('🆕 [REALTIME] Ejecutando onConversationInsert...')
              callbacksRef.current.onConversationInsert(newConversation)
            } else {
              if (import.meta.env.DEV) console.log('⚠️ [REALTIME] onConversationInsert no disponible')
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
            if (import.meta.env.DEV) console.log('🔄 [REALTIME] Conversación actualizada:', payload.new)
            const updatedConversation = payload.new as Conversation & { client_id?: string }
            if (clientId && updatedConversation.client_id && updatedConversation.client_id !== clientId) return
            if (callbacksRef.current.onConversationUpdate) {
              if (import.meta.env.DEV) console.log('🔄 [REALTIME] Ejecutando onConversationUpdate...')
              callbacksRef.current.onConversationUpdate(updatedConversation)
            } else {
              if (import.meta.env.DEV) console.log('⚠️ [REALTIME] onConversationUpdate no disponible')
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
            if (import.meta.env.DEV) console.log('🗑️ [REALTIME] Conversación eliminada:', payload.old)
            const deletedConversation = payload.old as { id: string }
            if (callbacksRef.current.onConversationDelete) {
              if (import.meta.env.DEV) console.log('🗑️ [REALTIME] Ejecutando onConversationDelete...')
              callbacksRef.current.onConversationDelete(deletedConversation.id)
            } else {
              if (import.meta.env.DEV) console.log('⚠️ [REALTIME] onConversationDelete no disponible')
            }
          }
        )

      // Suscribirse a los canales con reintentos
      if (import.meta.env.DEV) console.log('📡 [REALTIME] Suscribiendo a canal de mensajes...')
      let messagesRetryCount = 0
      const maxRetries = 3
      
      const subscribeMessages = () => {
        messagesChannel.subscribe((status) => {
          if (import.meta.env.DEV) console.log('📡 [REALTIME] Estado mensajes:', status)
          if (status === 'SUBSCRIBED') {
            if (import.meta.env.DEV) console.log('✅ [REALTIME] Mensajes activo')
            messagesRetryCount = 0
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ [REALTIME] Timeout en mensajes, reintentando...')
            if (messagesRetryCount < maxRetries) {
              messagesRetryCount++
              setTimeout(() => {
                messagesChannel.unsubscribe()
                subscribeMessages()
              }, 1000 * messagesRetryCount)
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [REALTIME] Error en la suscripción de mensajes')
            console.error('❌ [REALTIME] Detalles del error:', {
              channel: messagesChannel.topic,
              params: messagesChannel.params,
              socket: messagesChannel.socket.isConnected()
            })
            
            if (messagesRetryCount < maxRetries) {
              messagesRetryCount++
              console.log(`🔄 [REALTIME] Reintentando suscripción de mensajes (${messagesRetryCount}/${maxRetries})...`)
              setTimeout(() => {
                messagesChannel.unsubscribe()
                subscribeMessages()
              }, 2000 * messagesRetryCount)
            } else {
              toast.error('Error persistente de conexión en tiempo real para mensajes')
            }
          } else if (status === 'CLOSED') {
            console.warn('⚠️ [REALTIME] Canal de mensajes cerrado')
          } else {
            if (import.meta.env.DEV) console.log('📡 [REALTIME] Estado de mensajes:', status)
          }
        })
      }
      
      subscribeMessages()

      if (import.meta.env.DEV) console.log('📡 [REALTIME] Suscribiendo a canal de conversaciones...')
      let conversationsRetryCount = 0
      
      const subscribeConversations = () => {
        conversationsChannel.subscribe((status) => {
          if (import.meta.env.DEV) console.log('📡 [REALTIME] Estado conversaciones:', status)
          if (status === 'SUBSCRIBED') {
            if (import.meta.env.DEV) console.log('✅ [REALTIME] Conversaciones activa')
            conversationsRetryCount = 0
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ [REALTIME] Timeout en conversaciones, reintentando...')
            if (conversationsRetryCount < maxRetries) {
              conversationsRetryCount++
              setTimeout(() => {
                conversationsChannel.unsubscribe()
                subscribeConversations()
              }, 1000 * conversationsRetryCount)
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [REALTIME] Error en la suscripción de conversaciones')
            console.error('❌ [REALTIME] Detalles del error:', {
              channel: conversationsChannel.topic,
              params: conversationsChannel.params,
              socket: conversationsChannel.socket.isConnected()
            })
            
            if (conversationsRetryCount < maxRetries) {
              conversationsRetryCount++
              console.log(`🔄 [REALTIME] Reintentando suscripción de conversaciones (${conversationsRetryCount}/${maxRetries})...`)
              setTimeout(() => {
                conversationsChannel.unsubscribe()
                subscribeConversations()
              }, 2000 * conversationsRetryCount)
            } else {
              toast.error('Error persistente de conexión en tiempo real para conversaciones')
            }
          }
        })
      }
      
      subscribeConversations()

    } catch (error) {
      console.error('❌ [REALTIME] Error configurando suscripciones de tiempo real:', error)
      toast.error('Error configurando tiempo real')
    }

    // Función de limpieza
    return () => {
      if (import.meta.env.DEV) console.log('🧹 [REALTIME] Limpiando suscripciones de tiempo real...')
      if (messagesChannel) {
        messagesChannel.unsubscribe()
      }
      if (conversationsChannel) {
        conversationsChannel.unsubscribe()
      }
    }
  }, []) // ✅ FIX: NO re-configurar automáticamente - solo cuando se monte el hook

  useEffect(() => {
    if (import.meta.env.DEV) console.log('🔌 [REALTIME] Preparando suscripciones...')
    
    // ✅ FIX: Verificar si ya hay canales activos para evitar duplicados (React Strict Mode)
    const existingChannels = supabase.getChannels()
    const hasActiveChannels = existingChannels.some(ch => 
      ch.topic.includes('messages-changes') || ch.topic.includes('conversations-changes')
    )
    
    if (hasActiveChannels) {
      if (import.meta.env.DEV) console.log('🔌 [REALTIME] Canales existentes, salto configuración')
      return
    }
    
    const cleanup = setupRealtimeSubscriptions()
    if (import.meta.env.DEV) console.log('🔌 [REALTIME] Suscripciones configuradas')
    
    // ✅ FIX: Solo limpiar los canales específicos de este hook
    return () => {
      if (import.meta.env.DEV) console.log('🧹 [REALTIME] Cleanup useRealtimeConversations')
      if (cleanup) {
        cleanup()
      }
      // ✅ FIX: NO usar removeAllChannels() - la función cleanup ya limpia los canales específicos
      // Cada componente es responsable de sus propios canales
    }
  }, [clientId]) // ✅ FIX: Dependencia estable - solo re-configurar cuando cambie clientId

  return {
    setupRealtimeSubscriptions
  }
}
