import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
// Notificaciones deshabilitadas
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const
import { n8nService } from '@/services/n8nService'
import { useRealtimeConversations } from './useRealtimeConversations'

export interface Conversation {
  id: string
  user_id: string
  username?: string
  phone_number?: string
  status: 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'
  assigned_agent_id?: string
  assigned_agent_email?: string
  assigned_agent_name?: string
  summary?: string
  channel?: string
  last_message_sender_role?: 'user' | 'ai' | 'agent'
  last_message_at?: string
  last_message_content?: string
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
  const [refreshing, setRefreshing] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { user, profile } = useAuth()
  const p = profile as any

  // Fetch conversations
  const fetchConversations = useCallback(async (options?: { background?: boolean }) => {
    if (!user) {
      console.log('❌ fetchConversations: No user available')
      return
    }

    try {
      if (options?.background) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      console.log('🔍 fetchConversations: Starting fetch...')
      
      console.log('🔍 fetchConversations: Profile client_id:', p?.client_id)
      console.log('🔍 fetchConversations: Profile role:', p?.role)
      
      let query = supabase
        .from('tb_conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      // Aplicar filtro por cliente solo si existe en el perfil (RLS hace el resto)
      // Tipado defensivo: algunos perfiles antiguos podrían no tener client_id explícito
      const clientIdUnsafe = p?.client_id as string | undefined
      if (clientIdUnsafe) {
        query = (query as any).eq('client_id', clientIdUnsafe)
      }

      // If user is not admin, only show conversations assigned to them or pending
      const role = p?.role as string | undefined
      const profileId = p?.id as string | undefined
      if (role !== 'admin') {
        if (profileId) {
          console.log('🔒 Non-admin user, filtering conversations')
          query = (query as any).or(`assigned_agent_id.eq.${profileId},status.eq.pending_human,status.eq.active_ai`)
        } else {
          console.log('🔒 No profile ID, showing only pending')
          query = query.eq('status', 'pending_human')
        }
      } else {
        console.log('👑 Admin user, showing all conversations')
      }

      console.log('🔍 fetchConversations: Query construida, ejecutando...')
      console.log('🔍 fetchConversations: Profile client_id:', p?.client_id)
      console.log('🔍 fetchConversations: Profile role:', p?.role)
      const { data, error } = await (query as any)
      console.log('🔍 fetchConversations: Query ejecutada')
      console.log('🔍 fetchConversations: Error:', error)
      console.log('🔍 fetchConversations: Data length:', data?.length)
      console.log('🔍 fetchConversations: Data sample:', data?.slice(0, 2))
      // console.log('🔍 fetchConversations: Data client_ids:', (data as any)?.map((c: any) => c.client_id))

      if (error) {
        console.error('❌ Error fetching conversations:', error)
        toast.error('Error al cargar las conversaciones')
        return
      }

      console.log('✅ fetchConversations: Conversations fetched successfully:', data?.length || 0)
      console.log('🔍 fetchConversations: Obteniendo último mensaje de cada conversación...')

      // Obtener el último mensaje de cada conversación para determinar urgencia y previsualización
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation: any) => {
          try {
            const { data: lastMessage } = await supabase
              .from('tb_messages')
              .select('sender_role, content, created_at')
              .eq('conversation_id', conversation.id)
              // .eq('client_id', profile?.client_id) // Filtrar mensajes por cliente también
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            return {
              ...conversation,
              last_message_sender_role: lastMessage?.sender_role || null,
              last_message_at: lastMessage?.created_at || null,
              last_message_content: lastMessage?.content || null
            }
          } catch (error) {
            // Si no hay mensajes o hay error, devolver la conversación sin el campo
            return {
              ...conversation,
              last_message_sender_role: null,
              last_message_at: null,
              last_message_content: null
            }
          }
        })
      )

      console.log('✅ fetchConversations: Último mensaje obtenido para cada conversación')
      console.log('🔍 fetchConversations: Setting conversations in state...')
      setConversations(conversationsWithLastMessage)

      // Auto-cierre de conversaciones cuyo último mensaje del usuario tiene >24h
      try {
        const role = (profile as any)?.role as string | undefined
        if (role === 'admin') {
          const now = Date.now()
          const dayMs = 24 * 60 * 60 * 1000
          const toClose = (conversationsWithLastMessage || []).filter((c: any) => {
            if (!c || c.status === 'closed') return false
            if (!c.last_message_at) return false
            const age = now - new Date(c.last_message_at).getTime()
            return age >= dayMs
          })

          if (toClose.length > 0) {
            console.log(`🕒 Auto-cierre: cerrando ${toClose.length} conversación(es) por inactividad >24h`)
            for (const conv of toClose) {
              try {
                const { error } = await supabase
                  .from('tb_conversations')
                  .update({ status: 'closed', updated_at: new Date().toISOString() })
                  .eq('id', conv.id)
                if (!error) {
                  setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, status: 'closed', updated_at: new Date().toISOString() } : c))
                } else {
                  console.warn('⚠️ Auto-cierre: fallo al cerrar conversación', conv.id, error)
                }
              } catch (e) {
                console.warn('⚠️ Auto-cierre: excepción cerrando conversación', conv.id, e)
              }
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Auto-cierre: error general', e)
      }
      setIsInitialized(true)
    } catch (error) {
      console.error('❌ Exception fetching conversations:', error)
      toast.error('Error al cargar las conversaciones')
    } finally {
      if (options?.background) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
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
        agent_email: (p?.email as string | undefined),
        agent_name: (p?.name as string | undefined),
        responded_by_agent_id: (p?.id as string | undefined)
      }

      const { data: insertedMessage, error } = await supabase
        .from('tb_messages')
        .insert(newMessage)
        .select('*')
        .single()

      if (error) {
        console.error('Error sending message:', error)
        toast.error('Error al enviar el mensaje')
        return
      }

      // Optimistic: agregar inmediatamente el mensaje al estado si es la conversación activa
      if (insertedMessage && conversationId === selectedConversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === insertedMessage.id)) return prev
          return [...prev, insertedMessage as unknown as Message]
        })
      }

      // Update conversation status to active_human if it was pending
      await supabase
        .from('tb_conversations')
        .update({ 
          status: 'active_human',
          assigned_agent_id: (p?.id as string | undefined),
          assigned_agent_email: (p?.email as string | undefined),
          assigned_agent_name: (p?.name as string | undefined)
        })
        .eq('id', conversationId)

      // Actualizar inmediatamente la conversación en lista
      setConversations(prevConversations => prevConversations.map(conv =>
        conv.id === conversationId
          ? { 
              ...conv,
              status: 'active_human',
              assigned_agent_id: (p?.id as string | undefined),
              assigned_agent_email: (p?.email as string | undefined),
              assigned_agent_name: (p?.name as string | undefined),
              last_message_sender_role: senderRole,
              last_message_at: insertedMessage?.created_at || new Date().toISOString(),
              last_message_content: content,
              updated_at: insertedMessage?.created_at || new Date().toISOString()
            }
          : conv
      ))

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
              (p?.id as string | undefined), // Cambiar de profile.email a profile.id
              (p?.name as string | undefined)
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
      
      // El mensaje se agregará automáticamente vía tiempo real, no necesitamos refresh manual
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar el mensaje')
    }
  }, [user, profile, selectedConversationId])

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
      setConversations(prev => {
        const newConversations = [...prev]
        const index = newConversations.findIndex(c => c.id === conversationId)
        if (index !== -1) {
          newConversations[index] = { ...newConversations[index], ...updateData }
        }
        return newConversations
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
        setConversations(prev => {
          const newConversations = [...prev]
          const index = newConversations.findIndex(c => c.id === conversationId)
          if (index !== -1) {
            // Sin reversión compleja por simplicidad
          }
          return newConversations
        })
        return
      }

      console.log('✅ Estado de conversación actualizado exitosamente en BD')
      toast.success('Estado actualizado exitosamente')
      
    } catch (error) {
      console.error('❌ Error updating conversation status:', error)
      toast.error('Error al actualizar el estado')
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
      setConversations(prev => {
        const newConversations = [...prev]
        const index = newConversations.findIndex(c => c.id === conversationId)
        if (index !== -1) {
          newConversations[index] = { ...newConversations[index], ...updateData }
        }
        return newConversations
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
        setConversations(prev => [...prev])
        return
      }

      console.log('✅ Agente asignado exitosamente en BD')
      toast.success('Agente asignado exitosamente')
      
    } catch (error) {
      console.error('Error assigning agent:', error)
      toast.error('Error al asignar el agente')
    }
  }, [])

  // NUEVO: actualizar nombre visible del usuario (todas sus conversaciones)
  const updateUserDisplayName = useCallback(async (userId: string, newName: string) => {
    const trimmed = (newName || '').trim()
    if (!trimmed) {
      toast.error('El nombre no puede estar vacío')
      return { success: false }
    }
    try {
      console.log('✏️ Actualizando nombre de usuario:', { userId, newName: trimmed })

      // Optimistic update local
      setConversations(prev => prev.map(c => c.user_id === userId ? { ...c, username: trimmed, updated_at: new Date().toISOString() } : c))

      const { error } = await supabase
        .from('tb_conversations')
        .update({ username: trimmed, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) {
        console.error('❌ Error actualizando nombre de usuario:', error)
        toast.error('No se pudo actualizar el nombre')
        return { success: false, error }
      }

      console.log('✅ Nombre de usuario actualizado en BD')
      toast.success('Nombre actualizado')
      return { success: true }
    } catch (error) {
      console.error('❌ Excepción actualizando nombre de usuario:', error)
      toast.error('No se pudo actualizar el nombre')
      return { success: false, error }
    }
  }, [])

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    console.log('🎯 selectConversation called with:', conversationId)
    setSelectedConversationId(conversationId)
    console.log('📨 Fetching messages for conversation:', conversationId)
    await fetchMessages(conversationId)
  }, [fetchMessages])

  const clearSelectedConversation = useCallback(() => {
    console.log('🧹 Cleared selected conversation')
    setSelectedConversationId(null)
    setMessages([])
  }, [])

  // Effect to fetch messages when selectedConversationId changes
  useEffect(() => {
    if (selectedConversationId) {
      console.log('🔄 useEffect: selectedConversationId changed, fetching messages for:', selectedConversationId)
      fetchMessages(selectedConversationId)
    }
  }, [selectedConversationId, fetchMessages])

  // Configurar suscripciones de tiempo real
  const handleMessageInsert = useCallback((message: Message) => {
    console.log('📨 [REALTIME] Nuevo mensaje recibido:', message)
    console.log('📨 [REALTIME] Conversación seleccionada actual:', selectedConversationId)
    
    const isSelected = message.conversation_id === selectedConversationId

    // Solo agregar si es de la conversación seleccionada
    if (isSelected) {
      console.log('📨 [REALTIME] Agregando mensaje a la conversación seleccionada')
      setMessages(prevMessages => {
        // Evitar duplicados
        if (prevMessages.some(m => m.id === message.id)) {
          console.log('📨 [REALTIME] Mensaje duplicado, ignorando')
          return prevMessages
        }
        console.log('📨 [REALTIME] Mensaje agregado exitosamente')
        return [...prevMessages, message]
      })

      // Refetch inmediato para sincronizar cualquier campo derivado/orden
      fetchMessages(message.conversation_id)
    } else {
      console.log('📨 [REALTIME] Mensaje no es de la conversación seleccionada, solo actualizando conversación')
    }

    // Si es un mensaje del usuario y la conversación está en pending_response, cambiar a active_human
    if (message.sender_role === 'user') {
      setConversations(prevConversations => {
        const conversation = prevConversations.find(c => c.id === message.conversation_id)
        if (conversation && conversation.status === 'pending_response') {
          console.log('🔄 [REALTIME] Cambiando estado de pending_response a active_human por mensaje del usuario')
          
          // Actualizar en la base de datos
          supabase
            .from('tb_conversations')
            .update({ status: 'active_human' })
            .eq('id', message.conversation_id)
            .then(({ error }) => {
              if (error) {
                console.error('❌ Error actualizando estado de conversación:', error)
              } else {
                console.log('✅ Estado de conversación actualizado a active_human')
              }
            })
          
          // Actualizar en el estado local
          return prevConversations.map(conv =>
            conv.id === message.conversation_id
              ? { ...conv, status: 'active_human' as const }
              : conv
          )
        }
        return prevConversations
      })
    }
    
    // Actualizar último mensaje de la conversación si ya existe en estado
    console.log('📨 [REALTIME] Actualizando conversación con último mensaje')
    let existsInState = false
    setConversations(prevConversations => {
      const index = prevConversations.findIndex(c => c.id === message.conversation_id)
      if (index !== -1) {
        existsInState = true
        const target = prevConversations[index]
        const updatedTarget = {
          ...target,
          last_message_sender_role: message.sender_role,
          last_message_at: message.created_at,
          last_message_content: message.content,
          updated_at: message.created_at,
        } as any
        const rest = prevConversations.filter((c, i) => i !== index)
        // Mover al inicio para visibilidad inmediata
        return [updatedTarget, ...rest]
      }

      // Si no existe, devolver el array sin cambios en este paso; el flujo de reintento lo agregará
      return prevConversations
    })

    // Si la conversación aún no existe en el estado, crear placeholder inmediato y luego traerla (con reintentos breves)
    if (!existsInState) {
      console.log('🆕 [REALTIME] Conversación no está en el estado; agregando placeholder y intentando fetch con reintentos...')

      // Agregar placeholder para que aparezca instantáneamente en la lista
      try {
        setConversations(prev => {
          if (prev.some(c => c.id === message.conversation_id)) return prev
          const placeholder = {
            id: message.conversation_id,
            user_id: 'nuevo_usuario',
            username: 'Nuevo chat',
            phone_number: undefined,
            status: 'pending_human' as const,
            assigned_agent_id: undefined,
            assigned_agent_email: undefined,
            assigned_agent_name: undefined,
            summary: undefined,
            channel: undefined,
            last_message_sender_role: message.sender_role,
            last_message_at: message.created_at,
            last_message_content: message.content,
            created_at: message.created_at,
            updated_at: message.created_at,
          } as any
          return [placeholder, ...prev]
        })
      } catch (e) {
        console.warn('⚠️ [REALTIME] Error procesando mensaje:', e)
      }

      (async () => {
        const tryFetch = async (attempt: number) => {
          try {
            const { data: newConv, error: fetchConvError } = await supabase
              .from('tb_conversations')
              .select('*')
              .eq('id', message.conversation_id)
              .maybeSingle()

            if (fetchConvError) {
              console.warn(`⚠️ [REALTIME] Error trayendo conversación (intento ${attempt}):`, fetchConvError)
              return null
            }
            return newConv
          } catch (e) {
            console.warn(`⚠️ [REALTIME] Excepción trayendo conversación (intento ${attempt}):`, e)
            return null
          }
        }

        const delays = [0, 300, 900, 2000]
        let attached = false
        for (let i = 0; i < delays.length && !attached; i++) {
          if (delays[i] > 0) await new Promise(res => setTimeout(res, delays[i]))
          const conv = await tryFetch(i + 1)
          if (conv) {
            setConversations(prev => {
              const enriched = {
                ...conv,
                last_message_sender_role: message.sender_role,
                last_message_at: message.created_at,
                last_message_content: message.content,
              } as any
              const index = prev.findIndex(c => c.id === conv.id)
              if (index !== -1) {
                // Reemplazar placeholder/registro previo
                const rest = prev.filter((_, i) => i !== index)
                console.log('🆕 [REALTIME] Placeholder reemplazado por conversación real:', enriched.id)
                return [enriched, ...rest]
              }
              console.log('🆕 [REALTIME] Conversación agregada al estado por message insert (con retry):', enriched.id)
              return [enriched, ...prev]
            })
            attached = true
          }
        }

        // Refuerzo: si no se pudo obtener la conversación específica, refrescar listado completo
        if (!attached) {
          console.warn('⚠️ [REALTIME] No se pudo obtener la conversación por id tras reintentos. Refrescando listado...')
          try {
            await fetchConversations({ background: true })
          } catch (e) {
            console.warn('⚠️ [REALTIME] Error refrescando listado tras fallar fetch puntual:', e)
          }
        }
      })()
    }

    // Refresco ligero: asegurar que el panel se actualiza (p. ej., reorden/altas)
    try {
      setTimeout(() => {
        fetchConversations({ background: true }).catch(() => {})
      }, 200)
    } catch (e) {
      console.warn('⚠️ [REALTIME] Error en refresco ligero:', e)
    }
  }, [selectedConversationId, fetchMessages, fetchConversations])

  const handleConversationInsert = useCallback((conversation: Conversation) => {
    console.log('🆕 [REALTIME] Nueva conversación recibida:', conversation)
    setConversations(prevConversations => {
      // Evitar duplicados
      if (prevConversations.some(c => c.id === conversation.id)) {
        console.log('🆕 [REALTIME] Conversación duplicada, ignorando')
        return prevConversations
      }
      console.log('🆕 [REALTIME] Conversación agregada exitosamente')
      return [conversation, ...prevConversations]
    })
  }, [])

  const handleConversationUpdate = useCallback((conversation: Conversation) => {
    console.log('🔄 [REALTIME] Conversación actualizada:', conversation)
    console.log('🔄 [REALTIME] Estado anterior vs nuevo:', {
      id: conversation.id,
      newStatus: conversation.status,
      newAgent: conversation.assigned_agent_name
    })
    console.log('🔄 [REALTIME] DEBUG - Status es pending_response:', conversation.status === 'pending_response')
    console.log('🔄 [REALTIME] DEBUG - Status es closed:', conversation.status === 'closed')
    console.log('🔄 [REALTIME] DEBUG - Campo debería estar deshabilitado:', conversation.status === 'closed' || conversation.status === 'pending_response')
    
    setConversations(prevConversations => {
      const prevConversation = prevConversations.find(c => c.id === conversation.id)
      console.log('🔄 [REALTIME] Estado anterior en local:', prevConversation ? {
        status: prevConversation.status,
        agent: prevConversation.assigned_agent_name
      } : 'No encontrada')
      
      // Crear una nueva referencia del array para forzar re-render
      const updated = [...prevConversations]
      const index = updated.findIndex(conv => conv.id === conversation.id)
      
      if (index !== -1) {
        // Reemplazar completamente el objeto para asegurar que React detecte el cambio
        const newObj = {
          ...conversation,
          // Asegurar que todos los campos están presentes
          id: conversation.id,
          user_id: conversation.user_id,
          username: conversation.username,
          phone_number: conversation.phone_number,
          status: conversation.status,
          assigned_agent_id: conversation.assigned_agent_id,
          assigned_agent_email: conversation.assigned_agent_email,
          assigned_agent_name: conversation.assigned_agent_name,
          summary: conversation.summary,
          channel: conversation.channel,
          last_message_sender_role: conversation.last_message_sender_role,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at
        }
        // Mover al inicio del arreglo para máxima visibilidad
        const rest = updated.filter((_, i) => i !== index)
        return [newObj as any, ...rest]
      } else {
        // Si no existe en el estado, insertarla (esto cubre el caso donde el INSERT no fue visible por RLS y sí el UPDATE)
        console.log('🆕 [REALTIME] Conversación no estaba en estado. Agregando por UPDATE:', conversation.id)
        return [{
          ...conversation,
          id: conversation.id,
          user_id: conversation.user_id,
          username: conversation.username,
          phone_number: conversation.phone_number,
          status: conversation.status,
          assigned_agent_id: conversation.assigned_agent_id,
          assigned_agent_email: conversation.assigned_agent_email,
          assigned_agent_name: conversation.assigned_agent_name,
          summary: conversation.summary,
          channel: conversation.channel,
          last_message_sender_role: conversation.last_message_sender_role,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at
        } as any, ...updated]
      }
    })
    // Si es la conversación actualmente seleccionada, refrescar mensajes inmediatamente
    try {
      if (selectedConversationId && conversation.id === selectedConversationId) {
        fetchMessages(conversation.id)
      }
    } catch (e) {
      // Evitar romper el flujo por un fallo temporal
      console.warn('⚠️ [REALTIME] Error al refrescar mensajes tras update de conversación:', e)
    }
  }, [fetchMessages, selectedConversationId])

  // Usar el hook de tiempo real
  console.log('🔌 [REALTIME] Configurando hook useRealtimeConversations...')
  useRealtimeConversations({
    onMessageInsert: handleMessageInsert,
    onConversationInsert: handleConversationInsert,
    onConversationUpdate: handleConversationUpdate,
    userId: (p?.id as string | undefined),
    clientId: (p?.client_id as string | undefined)
  })
  console.log('🔌 [REALTIME] Hook useRealtimeConversations configurado')

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
    refreshing,
    selectedConversationId,
    sendMessage,
    updateConversationStatus,
    assignAgent,
    updateUserDisplayName,
    selectConversation,
    fetchConversations,
    fetchMessages,
    clearSelectedConversation
  }
}