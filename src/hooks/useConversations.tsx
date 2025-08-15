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

      console.log('✅ Conversations fetched successfully:', data)
      setConversations((data as any) || [])
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
      
      // Refresh conversations to update status
      await fetchConversations()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar el mensaje')
    }
  }, [user, profile, fetchMessages, fetchConversations])

  // Update conversation status
  const updateConversationStatus = useCallback(async (
    conversationId: string, 
    status: Conversation['status']
  ) => {
    try {
      console.log('🔄 Actualizando estado de conversación:', { conversationId, status })
      
      // Actualizar inmediatamente el estado local para sincronización instantánea
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                status, 
                updated_at: new Date().toISOString() 
              }
            : conv
        )
        console.log('✅ Estado local actualizado inmediatamente')
        return updatedConversations
      })
      
      const { error } = await supabase
        .from('tb_conversations')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
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
      toast.success('Estado actualizado')
      
      // Forzar una actualización adicional para asegurar sincronización
      setTimeout(() => {
        setConversations(prevConversations => {
          const currentConv = prevConversations.find(c => c.id === conversationId)
          if (currentConv && currentConv.status !== status) {
            console.log('🔄 Forzando sincronización adicional...')
            return prevConversations.map(conv => 
              conv.id === conversationId 
                ? { ...conv, status, updated_at: new Date().toISOString() }
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

      // Actualizar inmediatamente el estado local
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                assigned_agent_id: agentId,
                assigned_agent_email: agentProfile.email,
                assigned_agent_name: agentProfile.name,
                status: 'active_human',
                updated_at: new Date().toISOString()
              }
            : conv
        )
      )

      const { error } = await supabase
        .from('tb_conversations')
        .update({ 
          assigned_agent_id: agentId,
          assigned_agent_email: agentProfile.email,
          assigned_agent_name: agentProfile.name,
          status: 'active_human',
          updated_at: new Date().toISOString()
        })
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

      toast.success('Agente asignado')
      // No necesitamos fetchConversations() aquí
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
            
            console.log('🔄 Actualizando conversación en tiempo real:', { id, status, updated_at })
            
            setConversations(prevConversations => {
              const updatedConversations = prevConversations.map(conv => 
                conv.id === id 
                  ? { 
                      ...conv, 
                      status: status || conv.status,
                      assigned_agent_id: assigned_agent_id || conv.assigned_agent_id,
                      assigned_agent_email: assigned_agent_email || conv.assigned_agent_email,
                      assigned_agent_name: assigned_agent_name || conv.assigned_agent_name,
                      updated_at: updated_at || conv.updated_at
                    }
                  : conv
              )
              
              console.log('✅ Conversaciones actualizadas:', updatedConversations.length)
              return updatedConversations
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
  }, [user, selectedConversationId, fetchConversations])

  // Initial fetch
  useEffect(() => {
    console.log('🚀 useEffect initial fetch triggered')
    console.log('👤 User:', user)
    console.log('👤 Profile:', profile)
    if (user && profile) {
      console.log('✅ User and profile available, fetching conversations')
      fetchConversations()
    } else {
      console.log('❌ User or profile not available yet')
    }
  }, [fetchConversations, user, profile])

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