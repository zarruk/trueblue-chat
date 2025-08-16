import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { n8nService } from '@/services/n8nService'

export interface Conversation {
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
  last_message_sender_role?: 'user' | 'ai' | 'agent'
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  content: string
  sender_role: 'user' | 'ai' | 'agent'
  agent_email?: string
  agent_name?: string
  responded_by_agent_id?: string
  message_id?: string
  metadata?: any
  created_at: string
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { user, profile } = useAuth()

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) {
      console.log('❌ fetchConversations: No user available')
      return
    }

    try {
      setLoading(true)
      console.log('🔍 fetchConversations: Starting fetch...')
      
      let query = supabase
        .from('tb_conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      // If user is not admin, only show conversations assigned to them or pending
      if (profile?.role !== 'admin') {
        if (profile?.id) {
          console.log('🔒 Non-admin user, filtering conversations')
          query = query.or(`assigned_agent_id.eq.${profile.id},status.eq.pending_human`)
        } else {
          console.log('🔒 No profile ID, showing only pending')
          query = query.eq('status', 'pending_human')
        }
      } else {
        console.log('👑 Admin user, showing all conversations')
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error fetching conversations:', error)
        toast.error('Error al cargar las conversaciones')
        return
      }

      console.log('✅ fetchConversations: Conversations fetched successfully:', data?.length || 0)
      console.log('🔍 fetchConversations: Obteniendo último mensaje de cada conversación...')

      // Obtener el último mensaje de cada conversación para determinar urgencia
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation: any) => {
          try {
            const { data: lastMessage } = await supabase
              .from('tb_messages')
              .select('sender_role')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              ...conversation,
              last_message_sender_role: lastMessage?.sender_role || null
            }
          } catch (error) {
            // Si no hay mensajes o hay error, devolver la conversación sin el campo
            return {
              ...conversation,
              last_message_sender_role: null
            }
          }
        })
      )

      console.log('✅ fetchConversations: Último mensaje obtenido para cada conversación')
      console.log('🔍 fetchConversations: Setting conversations in state...')
      setConversations(conversationsWithLastMessage)
      setIsInitialized(true)
    } catch (error) {
      console.error('❌ Exception fetching conversations:', error)
      toast.error('Error al cargar las conversaciones')
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      console.log('❌ fetchMessages: No conversationId provided')
      return
    }

    try {
      console.log('🔍 fetchMessages: Fetching messages for conversation:', conversationId)
      const { data, error } = await supabase
        .from('tb_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ Error fetching messages:', error)
        toast.error('Error al cargar los mensajes')
        return
      }

      console.log('✅ Messages fetched successfully:', data)
      setMessages((data as any) || [])
    } catch (error) {
      console.error('❌ Exception fetching messages:', error)
      toast.error('Error al cargar los mensajes')
    }
  }, [])

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    senderRole: 'user' | 'ai' | 'agent'
  ) => {
    if (!user || !profile) {
      toast.error('Debes estar autenticado para enviar mensajes')
      return
    }

    try {
      const newMessage = {
        conversation_id: conversationId,
        content,
        sender_role: senderRole,
        agent_email: profile.email,
        agent_name: profile.name,
        responded_by_agent_id: profile.id
      }

      const { error } = await supabase
        .from('tb_messages')
        .insert(newMessage)

      if (error) {
        console.error('Error sending message:', error)
        toast.error('Error al enviar el mensaje')
        return
      }

      // Update conversation status to active_human if it was pending
      await supabase
        .from('tb_conversations')
        .update({ 
          status: 'active_human',
          assigned_agent_id: profile.id,
          assigned_agent_email: profile.email,
          assigned_agent_name: profile.name
        })
        .eq('id', conversationId)

      // Si el mensaje es enviado por un agente, enviarlo al webhook de n8n
      if (senderRole === 'agent') {
        console.log('🔍 senderRole es "agent", procediendo con webhook...')
        try {
          // Obtener la información de la conversación para el webhook
          console.log('🔍 Buscando conversación en BD:', conversationId)
          const { data: conversationData, error: conversationError } = await supabase
            .from('tb_conversations')
            .select('*')
            .eq('id', conversationId)
            .single()

          if (conversationError) {
            console.error('❌ Error buscando conversación:', conversationError)
            return
          }

          if (conversationData) {
            console.log('✅ Conversación encontrada:', conversationData)
            
            // Preparar y enviar el payload al webhook de n8n
            const webhookPayload = n8nService.prepareWebhookPayload(
              conversationId,
              conversationData,
              content,
              profile.id, // Cambiar de profile.email a profile.id
              profile.name
            )

            console.log('📤 Payload preparado para n8n:', webhookPayload)
            console.log('📤 Enviando mensaje a n8n webhook...')
            
            const n8nResponse = await n8nService.sendMessageToWebhook(webhookPayload)
            
            if (n8nResponse.success) {
              console.log('✅ Mensaje enviado exitosamente a n8n')
            } else {
              console.warn('⚠️ Advertencia: El mensaje se guardó pero hubo un problema con n8n:', n8nResponse.error)
            }
          } else {
            console.warn('⚠️ No se encontró la conversación para el webhook')
          }
        } catch (n8nError) {
          console.error('❌ Error con n8n webhook:', n8nError)
          // No bloqueamos el flujo principal si falla n8n
        }
      } else {
        console.log('🔍 senderRole NO es "agent":', senderRole)
      }

      toast.success('Mensaje enviado')
      
      // Refresh messages
      await fetchMessages(conversationId)
      
      // No llamamos fetchConversations() aquí porque el real-time subscription
      // ya maneja las actualizaciones automáticamente y evitamos sobrescribir
      // el estado local que puede haber sido actualizado por assignAgent u otros procesos
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar el mensaje')
    }
  }, [user, profile, fetchMessages])

  // Update conversation status
  const updateConversationStatus = useCallback(async (
    conversationId: string, 
    status: Conversation['status']
  ) => {
    try {
      console.log('🔄 Actualizando estado de conversación:', { conversationId, status })
      
      // Preparar datos de actualización
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      }
      
      // Si se regresa a IA, limpiar la asignación del agente
      if (status === 'active_ai') {
        updateData.assigned_agent_id = null
        updateData.assigned_agent_email = null
        updateData.assigned_agent_name = null
      }
      
      // Actualizar inmediatamente el estado local para sincronización instantánea
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                ...updateData,
                // Asegurar que las propiedades null se apliquen correctamente
                assigned_agent_id: updateData.assigned_agent_id !== undefined ? updateData.assigned_agent_id : conv.assigned_agent_id,
                assigned_agent_email: updateData.assigned_agent_email !== undefined ? updateData.assigned_agent_email : conv.assigned_agent_email,
                assigned_agent_name: updateData.assigned_agent_name !== undefined ? updateData.assigned_agent_name : conv.assigned_agent_name
              }
            : conv
        )
        console.log('✅ Estado local actualizado inmediatamente para cambio de status:', { conversationId, status, updateData })
        return updatedConversations
      })
      
      // Actualizar en base de datos
      const { error } = await supabase
        .from('tb_conversations')
        .update(updateData)
        .eq('id', conversationId)

      if (error) {
        console.error('❌ Error updating conversation status:', error)
        toast.error('Error al actualizar el estado')
        
        // Revertir el cambio local si falla la actualización en BD
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, status: conv.status } // Mantener el estado anterior
              : conv
          )
        )
        return
      }

      console.log('✅ Estado de conversación actualizado exitosamente en BD')
      toast.success('Estado actualizado exitosamente')
      
      // Forzar una actualización adicional para asegurar sincronización
      setTimeout(() => {
        setConversations(prevConversations => {
          const currentConv = prevConversations.find(c => c.id === conversationId)
          if (currentConv && (currentConv.status !== status || 
              (status === 'active_ai' && (currentConv.assigned_agent_id !== null || currentConv.assigned_agent_email !== null || currentConv.assigned_agent_name !== null)))) {
            console.log('🔄 Forzando sincronización adicional para cambio de status...', { current: currentConv, expected: updateData })
            return prevConversations.map(conv => 
              conv.id === conversationId 
                ? { 
                    ...conv, 
                    ...updateData,
                    assigned_agent_id: updateData.assigned_agent_id !== undefined ? updateData.assigned_agent_id : conv.assigned_agent_id,
                    assigned_agent_email: updateData.assigned_agent_email !== undefined ? updateData.assigned_agent_email : conv.assigned_agent_email,
                    assigned_agent_name: updateData.assigned_agent_name !== undefined ? updateData.assigned_agent_name : conv.assigned_agent_name
                  }
                : conv
            )
          }
          return prevConversations
        })
      }, 100)
      
    } catch (error) {
      console.error('❌ Error updating conversation status:', error)
      toast.error('Error al actualizar el estado')
      
      // Revertir el cambio local si falla
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, status: conv.status }
            : conv
        )
      )
    }
  }, [])

  // Assign agent to conversation
  const assignAgent = useCallback(async (
    conversationId: string, 
    agentId: string
  ) => {
    try {
      console.log('🎯 Asignando agente:', { conversationId, agentId })
      
      // Get agent profile
      const { data: agentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', agentId)
        .single()

      if (profileError || !agentProfile) {
        console.error('Error fetching agent profile:', profileError)
        toast.error('Error al obtener el perfil del agente')
        return
      }

      const updateData = {
        assigned_agent_id: agentId,
        assigned_agent_email: agentProfile.email,
        assigned_agent_name: agentProfile.name,
        status: 'active_human' as const,
        updated_at: new Date().toISOString()
      }

      // Actualizar inmediatamente el estado local para sincronización instantánea
      setConversations(prevConversations => {
        const conversationBefore = prevConversations.find(c => c.id === conversationId)
        console.log('🔄 assignAgent: Estado ANTES de la actualización:', conversationBefore)
        
        const updatedConversations = prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, ...updateData }
            : conv
        )
        
        const conversationAfter = updatedConversations.find(c => c.id === conversationId)
        console.log('✅ assignAgent: Estado DESPUÉS de la actualización local:', conversationAfter)
        console.log('🔄 assignAgent: Conversaciones totales actualizadas:', updatedConversations.length)
        
        return updatedConversations
      })

      // Actualizar en base de datos
      const { error } = await supabase
        .from('tb_conversations')
        .update(updateData)
        .eq('id', conversationId)

      if (error) {
        console.error('Error assigning agent:', error)
        toast.error('Error al asignar el agente')
        
        // Revertir el cambio local si falla
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv }
              : conv
          )
        )
        return
      }

      console.log('✅ Agente asignado exitosamente en BD')
      toast.success('Agente asignado exitosamente')
      
      // Forzar una actualización adicional para asegurar sincronización
      setTimeout(() => {
        console.log('⏰ assignAgent: Timeout ejecutándose para verificar sincronización...')
        setConversations(prevConversations => {
          const currentConv = prevConversations.find(c => c.id === conversationId)
          console.log('🔍 assignAgent: Estado actual en timeout:', currentConv)
          
          if (currentConv && (currentConv.status !== 'active_human' || currentConv.assigned_agent_id !== agentId)) {
            console.log('🔄 assignAgent: Forzando sincronización adicional...', {
              currentStatus: currentConv.status,
              expectedStatus: 'active_human',
              currentAgentId: currentConv.assigned_agent_id,
              expectedAgentId: agentId
            })
            return prevConversations.map(conv => 
              conv.id === conversationId 
                ? { ...conv, ...updateData }
                : conv
            )
          } else {
            console.log('✅ assignAgent: Estado ya sincronizado correctamente')
          }
          return prevConversations
        })
      }, 200)
      
    } catch (error) {
      console.error('Error assigning agent:', error)
      toast.error('Error al asignar el agente')
      
      // Revertir el cambio local si falla
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv }
            : conv
        )
      )
    }
  }, [])

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    console.log('🎯 selectConversation called with:', conversationId)
    setSelectedConversationId(conversationId)
    console.log('📨 Fetching messages for conversation:', conversationId)
    await fetchMessages(conversationId)
  }, [fetchMessages])

  // Effect to fetch messages when selectedConversationId changes
  useEffect(() => {
    if (selectedConversationId) {
      console.log('🔄 useEffect: selectedConversationId changed, fetching messages for:', selectedConversationId)
      fetchMessages(selectedConversationId)
    }
  }, [selectedConversationId, fetchMessages])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    console.log('🔌 Configurando suscripciones de real-time...')

    // Subscribe to conversation updates
    const conversationsSubscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tb_conversations'
        },
        (payload) => {
          console.log('📡 Real-time conversation update:', payload)
          
          if (payload.eventType === 'UPDATE') {
            const { id, status, assigned_agent_id, assigned_agent_email, assigned_agent_name, updated_at } = payload.new
            
            console.log('🔄 Real-time: Actualizando conversación:', { 
              id, 
              status, 
              assigned_agent_id, 
              assigned_agent_email, 
              assigned_agent_name, 
              updated_at 
            })
            
            // Aplicar actualización remota con merge inteligente
            setConversations(prevConversations => {
              const existingConv = prevConversations.find(conv => conv.id === id)
              if (existingConv) {
                const localUpdateTime = new Date(existingConv.updated_at).getTime()
                const remoteUpdateTime = new Date(updated_at).getTime()
                
                // Siempre aplicar cambios de estado importantes, independientemente del timestamp
                const shouldForceUpdate = existingConv.status !== status || 
                  existingConv.assigned_agent_id !== assigned_agent_id ||
                  existingConv.assigned_agent_email !== assigned_agent_email ||
                  existingConv.assigned_agent_name !== assigned_agent_name
                
                // Si la actualización remota es más reciente O contiene cambios importantes, aplicar
                if (remoteUpdateTime >= localUpdateTime || shouldForceUpdate) {
                  console.log('✅ Aplicando actualización remota:', { 
                    remote: remoteUpdateTime, 
                    local: localUpdateTime, 
                    forceUpdate: shouldForceUpdate,
                    changes: { status, assigned_agent_id, assigned_agent_email, assigned_agent_name }
                  })
                  const updatedConversations = prevConversations.map(conv => 
                    conv.id === id 
                      ? { 
                          ...conv, 
                          status: status !== undefined ? status : conv.status,
                          assigned_agent_id: assigned_agent_id !== undefined ? assigned_agent_id : conv.assigned_agent_id,
                          assigned_agent_email: assigned_agent_email !== undefined ? assigned_agent_email : conv.assigned_agent_email,
                          assigned_agent_name: assigned_agent_name !== undefined ? assigned_agent_name : conv.assigned_agent_name,
                          updated_at: updated_at || conv.updated_at
                        }
                      : conv
                  )
                  return updatedConversations
                } else {
                  console.log('⏭️ Ignorando actualización remota (local es más reciente y sin cambios importantes)')
                  return prevConversations
                }
              }
              
              // Si no existe la conversación, agregarla
              return prevConversations
            })
          } else if (payload.eventType === 'INSERT') {
            console.log('🆕 Nueva conversación detectada, refrescando lista...')
            fetchConversations()
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción de conversaciones:', status)
      })

    // Subscribe to message updates
    const messagesSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tb_messages'
        },
        (payload) => {
          console.log('📡 Real-time message update:', payload)
          
          if (payload.eventType === 'INSERT' && selectedConversationId) {
            const newMessage = payload.new as Message
            if (newMessage.conversation_id === selectedConversationId) {
              console.log('📨 Nuevo mensaje agregado en tiempo real')
              setMessages(prevMessages => [...prevMessages, newMessage])
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción de mensajes:', status)
      })

    return () => {
      console.log('🔌 Desconectando suscripciones de real-time...')
      conversationsSubscription.unsubscribe()
      messagesSubscription.unsubscribe()
    }
  }, [user, selectedConversationId])

  // Initial fetch
  useEffect(() => {
    console.log('🚀 useEffect initial fetch triggered')
    console.log('👤 User:', user)
    console.log('👤 Profile:', profile)
    console.log('🔄 isInitialized:', isInitialized)
    
    if (user && profile && !isInitialized) {
      console.log('✅ User and profile available, fetching conversations (first time)')
      fetchConversations()
    } else if (!user || !profile) {
      console.log('❌ User or profile not available yet')
      setIsInitialized(false)
    } else if (isInitialized) {
      console.log('⏭️ Already initialized, skipping fetch')
    }
  }, [user, profile, isInitialized, fetchConversations])

  return {
    conversations,
    messages,
    loading,
    selectedConversationId,
    sendMessage,
    updateConversationStatus,
    assignAgent,
    selectConversation,
    fetchConversations,
    fetchMessages
  }
}