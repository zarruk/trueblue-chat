import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
// Notificaciones deshabilitadas
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const
import { n8nService } from '@/services/n8nService'
import { useRealtimeConversations } from './useRealtimeConversations'

// ✅ SOLUCIÓN 2: Función debounce simple
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

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

// Función de priorización de conversaciones
// Prioridad: 1) pending_human, 2) active_human con último mensaje del usuario, 3) pending_response, 4) active_human respondidas, 5) active_ai, 6) closed
const getPriority = (c: Conversation) => {
  if (c.status === 'pending_human') return 1
  if (c.status === 'active_human' && c.last_message_sender_role === 'user') return 2
  if (c.status === 'pending_response') return 3
  if (c.status === 'active_human') return 4
  if (c.status === 'active_ai') return 5
  if (c.status === 'closed') return 6
  return 7
}

// Función para ordenar conversaciones por prioridad
const sortConversationsByPriority = (conversations: Conversation[]) => {
  return [...conversations].sort((a, b) => {
    // Prioridad primero, timestamp como tie-breaker
    const pa = getPriority(a)
    const pb = getPriority(b)
    if (pa !== pb) return pa - pb
    
    // Tie-breaker by timestamp if same priority
    const aRef = a.last_message_at || a.updated_at
    const bRef = b.last_message_at || b.updated_at
    return new Date(bRef).getTime() - new Date(aRef).getTime()
  })
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSelectingConversation, setIsSelectingConversation] = useState(false)
  const { user, profile, clientId, isProfileReady } = useAuth()
  const p = profile as any
  
  // Cola simple para evitar llamadas simultáneas a fetchConversations
  const isFetchingRef = useRef(false)
  
  // ID único para identificar la consulta más reciente de fetchMessages
  const fetchMessagesQueryId = useRef<number | null>(null)

  // Estados para scroll infinito
  const [currentPage, setCurrentPage] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalCount, setTotalCount] = useState(0)

  // Estados para control inteligente de scroll y tiempo real
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null)
  const [newConversationIds, setNewConversationIds] = useState<Set<string>>(new Set())

  // Estados para el pool de conversaciones priorizadas
  const [conversationPool, setConversationPool] = useState<Conversation[]>([])
  const [poolOffset, setPoolOffset] = useState(0)
  const [poolSize] = useState(100) // Tamaño del pool inicial

  // Fetch conversations
  const fetchConversations = useCallback(async (options?: { background?: boolean }) => {
    if (!user || !isProfileReady) {
      console.log('❌ fetchConversations: No user available or profile not ready')
      return
    }

    // Cola simple: si ya hay una llamada en progreso, ignorar esta
    if (isFetchingRef.current) {
      console.log('⏭️ fetchConversations: Ya hay una llamada en progreso, ignorando...')
      return
    }

    try {
      isFetchingRef.current = true
      
      if (options?.background) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      console.log('🔍 fetchConversations: Starting fetch...')
      
      console.log('🔍 fetchConversations: Client ID:', clientId)
      console.log('🔍 fetchConversations: Profile role:', p?.role)
      
      // 🎯 NUEVO: Usar RPC para traer conversaciones ya ordenadas por prioridad
      const role = p?.role as string | undefined
      const profileId = p?.id as string | undefined
      
      if (role !== 'admin') {
        if (profileId) {
          console.log('🔒 Non-admin user, filtering conversations')
        } else {
          console.log('🔒 No profile ID, showing only pending')
        }
      } else {
        console.log('👑 Admin user, showing all conversations')
      }

      console.log('🔍 fetchConversations: Ejecutando RPC get_prioritized_conversations...')
      console.log('🔍 fetchConversations: Parámetros:', {
        p_client_id: clientId || null,
        p_agent_id: profileId || null,
        p_is_admin: role === 'admin',
        p_limit: poolSize,
        p_offset: 0
      })
      
      // ✅ Usar función RPC para ordenamiento por prioridad en BD
      const { data, error } = await (supabase.rpc as any)('get_prioritized_conversations', {
        p_client_id: clientId || null,
        p_agent_id: profileId || null,
        p_is_admin: role === 'admin',
        p_limit: poolSize,
        p_offset: 0
      })
      
      console.log('✅ fetchConversations: Query ejecutada')
      console.log('📊 fetchConversations: Data length:', data?.length)
      console.log('📊 fetchConversations: Error:', error)

      if (error) {
        console.error('❌ Error fetching conversations:', error)
        toast.error('Error al cargar las conversaciones')
        return
      }

      console.log('✅ fetchConversations: Conversations fetched successfully:', data?.length || 0)
      
      // Para recargas en background, usar datos más simples para evitar timeout
      if (options?.background) {
        console.log('🔄 fetchConversations: Modo background - usando datos básicos sin último mensaje')
        const basicConversations = (data || []).map((conversation: any) => ({
          ...conversation,
          last_message_sender_role: null,
          last_message_at: null,
          last_message_content: null
        }))
        
        // Aplicar priorización básica
        const prioritizedPool = sortConversationsByPriority(basicConversations)
        setConversationPool(prioritizedPool)
        setPoolOffset(0)
        
        const initialConversations = prioritizedPool.slice(0, 20)
        console.log('🔄 fetchConversations: Setting conversations in background mode:', initialConversations.length)
        setConversations(initialConversations)
        
        if (!options?.background) {
          setCurrentPage(0)
          setHasMore(prioritizedPool.length > 20)
          setTotalCount(prioritizedPool.length)
        }
        
        setIsInitialized(true)
        console.log('✅ fetchConversations: Background mode completed, isInitialized = true')
        return
      }
      
      console.log('🔍 fetchConversations: Obteniendo último mensaje de cada conversación...')

      // Obtener el último mensaje de cada conversación para determinar urgencia y previsualización
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation: any) => {
          try {
            let query: any = supabase
              .from('tb_messages')
              .select('sender_role, content, created_at')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)

            // NOTA: No aplicamos filtro por client_id aquí porque los mensajes ya están filtrados
            // indirectamente a través de la relación conversation_id -> tb_conversations.client_id

            const { data: lastMessage, error: messageError } = await query.maybeSingle()

            if (messageError) {
              console.warn('⚠️ Error obteniendo último mensaje para conversación:', conversation.id, messageError)
            }

            const result = {
              ...conversation,
              last_message_sender_role: lastMessage?.sender_role || null,
              last_message_at: lastMessage?.created_at || null,
              last_message_content: lastMessage?.content || null
            }

            if (!lastMessage) {
              console.log('📭 No hay mensajes para conversación:', conversation.id, conversation.username || conversation.user_id)
            }

            return result
          } catch (error) {
            console.warn('⚠️ Excepción obteniendo último mensaje para conversación:', conversation.id, error)
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
      console.log('🔍 fetchConversations: Aplicando priorización...')
      
      // Aplicar priorización al pool de conversaciones
      const prioritizedPool = sortConversationsByPriority(conversationsWithLastMessage)
      console.log('✅ fetchConversations: Pool priorizado:', prioritizedPool.length, 'conversaciones')
      
      // Guardar el pool priorizado para el scroll infinito
      setConversationPool(prioritizedPool)
      setPoolOffset(0)
      
      // En la carga inicial, mostrar solo las primeras 20 conversaciones del pool priorizado
      const initialConversations = prioritizedPool.slice(0, 20)
      console.log('🔍 fetchConversations: Mostrando primeras', initialConversations.length, 'conversaciones del pool')
      
      console.log('🔍 fetchConversations: Setting conversations in state...')
      console.log('🔍 fetchConversations: initialConversations.length =', initialConversations.length)
      setConversations(initialConversations)
      console.log('✅ fetchConversations: setConversations called with', initialConversations.length, 'conversations')
      
      // Resetear estados de paginación en la carga inicial
      if (!options?.background) {
        setCurrentPage(0)
        setHasMore(prioritizedPool.length > 20) // Hay más si el pool tiene más de 20 conversaciones
        setTotalCount(prioritizedPool.length)
        console.log('🔄 fetchConversations: hasMore =', prioritizedPool.length > 20, 'poolSize =', prioritizedPool.length)
      }

      // ✅ FIX: Resetear loading ANTES de la sección de auto-cierre que puede colgarse
      if (!options?.background) {
        setLoading(false)
        console.log('🧹 fetchConversations: setLoading(false) called BEFORE auto-cierre')
      }
      setIsInitialized(true)
      console.log('✅ fetchConversations: setIsInitialized(true) called')

      // ✅ FIX: Auto-cierre en background para no bloquear la UI
      setTimeout(async () => {
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
      }, 0) // Ejecutar en el siguiente tick del event loop
    } catch (error) {
      console.error('❌ Exception fetching conversations:', error)
      toast.error('Error al cargar las conversaciones')
    } finally {
      console.log('🧹 fetchConversations: Finally block executing')
      isFetchingRef.current = false
      console.log('🧹 fetchConversations: isFetchingRef.current = false')
      
      if (options?.background) {
        setRefreshing(false)
        console.log('🧹 fetchConversations: setRefreshing(false) called')
      } else {
        // ✅ FIX: setLoading(false) ya se ejecutó antes, solo loggear
        console.log('🧹 fetchConversations: setLoading(false) already called before auto-cierre')
      }
    }
  }, [user, clientId, isProfileReady, p?.id, p?.role, poolSize])

  // ✅ SOLUCIÓN 2: Verificar estado de WebSocket antes de consultas
  const isSupabaseReady = useCallback(() => {
    try {
      const channels = supabase.getChannels()
      const readyChannels = channels.filter(channel => 
        channel.state === 'joined'
      )
      const erroredChannels = channels.filter(channel => 
        channel.state === 'errored' || channel.state === 'closed'
      )
      
      console.log(`🔍 WebSocket Status: ${readyChannels.length}/${channels.length} canales listos, ${erroredChannels.length} con errores`)
      
      // Considerar listo si:
      // 1. No hay canales (primera carga)
      // 2. Hay al menos un canal listo
      // 3. No hay canales con errores críticos
      const isReady = channels.length === 0 || 
                     (readyChannels.length > 0 && erroredChannels.length === 0)
      
      if (!isReady && channels.length > 0) {
        console.log('🔍 Canales no listos:', channels.map(ch => ({
          topic: ch.topic,
          state: ch.state
        })))
      }
      
      return isReady
    } catch (error) {
      console.warn('⚠️ Error verificando estado de WebSocket:', error)
      return true // Fallback: asumir que está listo
    }
  }, [])

  // Fetch messages for a conversation with retry logic
  const fetchMessagesWithRetry = useCallback(async (conversationId: string, retries = 3): Promise<boolean> => {
    if (!conversationId) {
      console.log('❌ fetchMessages: No conversationId provided')
      return false
    }

    // ✅ SOLUCIÓN 1: Crear ID único para esta consulta
    const queryId = Date.now() + Math.random()
    console.log(`🔍 fetchMessages: Iniciando consulta ${queryId} para conversación:`, conversationId)
    
    // ✅ GUARDAR ID DE CONSULTA MÁS RECIENTE
    fetchMessagesQueryId.current = queryId

    // ✅ TIMEOUT REDUCIDO: 3 segundos en lugar de 8
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('fetchMessages timeout after 3s')), 3000)
    );

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 fetchMessages: Intento ${attempt}/${retries} para consulta ${queryId}`)
        console.log('🔍 fetchMessages: Starting query to tb_messages table...')
        
        const queryPromise = supabase
          .from('tb_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100) // ✅ LIMITAR a 100 mensajes máximo para mejor rendimiento

        console.log('🔍 fetchMessages: Executing query with timeout...')
        
        // Competencia: la que termine primero gana (query o timeout)
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
        
        console.log('🔍 fetchMessages: Query completed. Data length:', data?.length, 'Error:', error)

        if (error) {
          console.error(`❌ Error fetching messages (intento ${attempt}):`, error)
          
          if (attempt === retries) {
            toast.error('Error al cargar los mensajes después de múltiples intentos')
            return false
          }
          
          // Esperar antes del siguiente intento (backoff exponencial)
          const waitTime = 1000 * Math.pow(2, attempt - 1) // 1s, 2s, 4s
          console.log(`⏳ Esperando ${waitTime}ms antes del siguiente intento...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }

        console.log('✅ Messages fetched successfully:', data?.length || 0, 'messages for conversation:', conversationId)
        
        // Log detallado de los primeros 3 mensajes para debugging
        if (data && data.length > 0) {
          console.log('📨 fetchMessages: Primeros mensajes:', data.slice(0, 3).map((m: any) => ({
            id: m.id,
            sender: m.sender_role,
            preview: m.content?.substring(0, 30) + '...',
            time: m.created_at
          })))
        } else {
          console.log('📭 fetchMessages: No hay mensajes en esta conversación')
        }
        
        // ✅ VERIFICACIÓN FINAL: Solo actualizar si es la consulta más reciente
        if (queryId === fetchMessagesQueryId.current) {
          console.log(`✅ fetchMessages: Consulta ${queryId} es la más reciente, actualizando mensajes`)
          setMessages((data as any) || [])
          return true // Éxito, salir del loop de reintentos
        } else {
          console.log(`⏭️ fetchMessages: Consulta ${queryId} es antigua, ignorando resultado`)
          return false // Antigua, no es exitosa
        }
        
      } catch (error) {
        console.error(`❌ Exception fetching messages (intento ${attempt}):`, error)
        
        if (attempt === retries) {
          toast.error('Error al cargar los mensajes después de múltiples intentos')
          return false
        }
        
        // Esperar antes del siguiente intento (backoff exponencial)
        const waitTime = 1000 * Math.pow(2, attempt - 1) // 1s, 2s, 4s
        console.log(`⏳ Esperando ${waitTime}ms antes del siguiente intento...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    // Si llegamos aquí, significa que todos los intentos fallaron
    return false
  }, [clientId, isSupabaseReady])

  // Mantener función original para compatibilidad
  const fetchMessages = fetchMessagesWithRetry

  // ✅ SOLUCIÓN 2: Debounce para evitar múltiples llamadas simultáneas
  const fetchMessagesDebounced = useMemo(
    () => debounce(fetchMessagesWithRetry, 300), // 300ms de debounce
    [fetchMessagesWithRetry]
  )

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    senderRole: 'user' | 'ai' | 'agent',
    metadata?: any
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
        responded_by_agent_id: (p?.id as string | undefined),
        ...(metadata && { metadata })
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
        console.log('🔍 Metadata recibido en sendMessage:', metadata)
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
              (p?.name as string | undefined),
              metadata // Pasar metadata si existe (para archivos adjuntos)
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
  }, [user, profile, selectedConversationId, p?.email, p?.id, p?.name])

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
    console.log('🎯 selectConversation: isSelectingConversation =', isSelectingConversation)
    console.log('🎯 selectConversation: selectedConversationId =', selectedConversationId)
    
    // ✅ FIX: Evitar loops infinitos con verificación más simple
    if (isSelectingConversation) {
      console.log('🚫 selectConversation: Ya en proceso, ignorando...')
      return
    }
    
    if (selectedConversationId === conversationId) {
      console.log('🚫 selectConversation: Misma conversación, ignorando...')
      return
    }
    
    setIsSelectingConversation(true)
    console.log('🎯 selectConversation: Iniciando selección...')
    
    try {
      setSelectedConversationId(conversationId)
      console.log('📨 selectConversation: About to fetch messages for conversation:', conversationId)
      // ✅ SOLUCIÓN 2: Usar versión con debounce para evitar múltiples llamadas simultáneas
      const success = await fetchMessagesDebounced(conversationId)
      
      if (success) {
        console.log('✅ selectConversation: Completado exitosamente')
      } else {
        console.log('⏭️ selectConversation: fetchMessages fue cancelado, no completando selección')
      }
    } catch (error) {
      console.error('❌ selectConversation: Error:', error)
    } finally {
      console.log('🧹 selectConversation: Reseteando isSelectingConversation')
      setIsSelectingConversation(false)
    }
  }, [fetchMessagesDebounced]) // ✅ SOLUCIÓN 2: Usar fetchMessagesDebounced

  const clearSelectedConversation = useCallback(() => {
    console.log('🧹 Cleared selected conversation')
    setSelectedConversationId(null)
    setMessages([])
  }, [])

  // Función para manejar cambios de estado de scroll
  const handleScrollStateChange = useCallback((isScrolling: boolean) => {
    // console.log('📜 Scroll state changed:', isScrolling)
    setIsUserScrolling(isScrolling)
    
    if (isScrolling) {
      // Limpiar timeout anterior
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      // Después de 2 segundos sin scroll, volver a modo normal
      const newTimeout = setTimeout(() => {
        // console.log('📜 Returning to normal mode after scroll timeout')
        setIsUserScrolling(false)
        // Limpiar indicadores de nuevas conversaciones
        setNewConversationIds(new Set())
      }, 2000)
      
      setScrollTimeout(newTimeout)
    }
  }, [scrollTimeout])

  // Función para cargar más conversaciones del pool
  const loadMoreFromPool = useCallback(async () => {
    try {
      setLoadingMore(true)
      console.log('🔄 loadMore: Cargando desde el pool, página', currentPage + 1)
      
      // Calcular cuántas conversaciones mostrar del pool
      const nextPage = currentPage + 1
      const conversationsToShow = nextPage * 20
      const conversationsToDisplay = conversationPool.slice(0, conversationsToShow)
      
      console.log('🔄 loadMore: Mostrando', conversationsToDisplay.length, 'de', conversationPool.length, 'conversaciones del pool')
      
      // Actualizar la lista con las conversaciones del pool
      setConversations(conversationsToDisplay)
      setCurrentPage(nextPage)

      // Si ya mostramos todas las conversaciones del pool, necesitamos cargar más
      if (conversationsToDisplay.length >= conversationPool.length) {
        console.log('📦 loadMore: Pool agotado, cargando más conversaciones...')
        await loadMoreConversationsFromDB()
      }

      console.log('✅ loadMore: Cargadas', conversationsToDisplay.length, 'conversaciones del pool')
    } catch (error) {
      console.error('❌ Error loading more from pool:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [currentPage, conversationPool])

  // Función para cargar más conversaciones de la base de datos
  const loadMoreConversationsFromDB = useCallback(async () => {
    try {
      console.log('🗄️ loadMoreConversationsFromDB: Cargando más conversaciones de la BD')
      console.log('🗄️ loadMoreConversationsFromDB: poolOffset =', poolOffset, 'poolSize =', poolSize)
      
      // 🎯 NUEVO: Usar RPC con offset para mantener ordenamiento por prioridad
      const role = p?.role as string | undefined
      const profileId = p?.id as string | undefined

      console.log('🗄️ loadMoreConversationsFromDB: Ejecutando RPC get_prioritized_conversations...')
      console.log('🗄️ loadMoreConversationsFromDB: Parámetros:', {
        p_client_id: clientId || null,
        p_agent_id: profileId || null,
        p_is_admin: role === 'admin',
        p_limit: poolSize,
        p_offset: poolOffset + poolSize
      })
      
      // ✅ TIMEOUT: Agregar timeout de 10 segundos para evitar cuelgues
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 10s')), 10000)
      );
      
      const queryPromise = (supabase.rpc as any)('get_prioritized_conversations', {
        p_client_id: clientId || null,
        p_agent_id: profileId || null,
        p_is_admin: role === 'admin',
        p_limit: poolSize,
        p_offset: poolOffset + poolSize
      });
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log('🗄️ loadMoreConversationsFromDB: Query ejecutada. Data length:', data?.length, 'Error:', error)

      if (error) {
        console.error('❌ Error loading more conversations from DB:', error)
        console.log('🔄 loadMoreConversationsFromDB: hasMore cambiado a FALSE por error')
        setHasMore(false)
        setLoadingMore(false) // ✅ CRÍTICO: Resetear loading
        return
      }

      if (!data || data.length === 0) {
        console.log('✅ loadMoreConversationsFromDB: No hay más conversaciones en la BD')
        console.log('🔄 loadMoreConversationsFromDB: hasMore cambiado a FALSE - No hay más conversaciones')
        setHasMore(false)
        setLoadingMore(false) // ✅ CRÍTICO: Resetear loading
        return
      }

      console.log('🗄️ loadMoreConversationsFromDB: Obteniendo últimos mensajes de', data.length, 'conversaciones...')
      
      // ✅ OPTIMIZACIÓN: Cargar en background sin bloquear, simplemente agregar al pool sin último mensaje
      // Los últimos mensajes se pueden cargar después de forma lazy o en segundo plano
      console.log('⚡ loadMoreConversationsFromDB: Modo rápido - agregando conversaciones sin último mensaje')
      
      const newConversations = (data || []).map((conversation: any) => ({
        ...conversation,
        last_message_sender_role: null,
        last_message_at: null,
        last_message_content: null
      }))

      console.log('🗄️ loadMoreConversationsFromDB: Aplicando priorización...')
      // Aplicar priorización a las nuevas conversaciones
      const newPrioritizedConversations = sortConversationsByPriority(newConversations)
      
      console.log('🗄️ loadMoreConversationsFromDB: Agregando al pool...')
      // Agregar las nuevas conversaciones al pool existente
      setConversationPool(prev => {
        const combined = [...prev, ...newPrioritizedConversations]
        // Re-priorizar el pool completo para mantener el orden correcto
        return sortConversationsByPriority(combined)
      })
      
      console.log('🗄️ loadMoreConversationsFromDB: Actualizando offset...')
      // Actualizar el offset para el siguiente lote
      setPoolOffset(prev => prev + poolSize)
      
      // Actualizar hasMore basándose en si se cargaron menos conversaciones de las esperadas
      if (newPrioritizedConversations.length < poolSize) {
        console.log('🔄 loadMoreConversationsFromDB: hasMore cambiado a FALSE - Menos conversaciones de las esperadas')
        setHasMore(false)
      }
      
      console.log('✅ loadMoreConversationsFromDB: Agregadas', newPrioritizedConversations.length, 'conversaciones al pool')
      
      // ✅ OPTIMIZACIÓN: Cargar los últimos mensajes en background sin bloquear la UI
      console.log('⚡ loadMoreConversationsFromDB: Cargando últimos mensajes en background...')
      setTimeout(async () => {
        try {
          const conversationsWithLastMessage = await Promise.all(
            (data || []).map(async (conversation: any) => {
              try {
                const { data: lastMessage } = await supabase
                  .from('tb_messages')
                  .select('sender_role, content, created_at')
                  .eq('conversation_id', conversation.id)
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
                return {
                  ...conversation,
                  last_message_sender_role: null,
                  last_message_at: null,
                  last_message_content: null
                }
              }
            })
          )
          
          console.log('✅ loadMoreConversationsFromDB: Últimos mensajes cargados en background')
          
          // Actualizar el pool con los últimos mensajes
          setConversationPool(prev => {
            // Reemplazar las conversaciones que acabamos de actualizar
            const updated = prev.map(conv => {
              const withMessage = conversationsWithLastMessage.find(c => c.id === conv.id)
              return withMessage || conv
            })
            return sortConversationsByPriority(updated)
          })
        } catch (error) {
          console.warn('⚠️ loadMoreConversationsFromDB: Error cargando últimos mensajes en background:', error)
        }
      }, 0) // Ejecutar en el siguiente tick
    } catch (error) {
      console.error('❌ Error loading more conversations from DB:', error)
      setHasMore(false)
      setLoadingMore(false) // ✅ CRÍTICO: Resetear loading
    }
  }, [poolOffset, poolSize, clientId, p?.role, p?.id])

  // Función principal para cargar más conversaciones (scroll infinito)
  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore) {
      console.log('❌ loadMore: No se puede cargar más - user:', !!user, 'loadingMore:', loadingMore, 'hasMore:', hasMore)
      return
    }

    await loadMoreFromPool()
  }, [user, loadingMore, hasMore, loadMoreFromPool])

  // Función de búsqueda (placeholder por ahora)
  const searchConversations = useCallback(async (query: string) => {
    console.log('🔍 searchConversations: Buscando:', query)
    setSearchQuery(query)
    setIsSearching(true)
    
    // TODO: Implementar búsqueda real
    // Por ahora solo resetear la lista
    setTimeout(() => {
      setIsSearching(false)
    }, 500)
  }, [])

  // Effect to fetch messages when selectedConversationId changes
  // COMENTADO: fetchMessages ya se ejecuta desde selectConversation, evitar duplicación
  // useEffect(() => {
  //   if (selectedConversationId) {
  //     console.log('🔄 useEffect: selectedConversationId changed, fetching messages for:', selectedConversationId)
  //     fetchMessages(selectedConversationId)
  //   }
  // }, [selectedConversationId, fetchMessages])

  // Configurar suscripciones de tiempo real
  const handleMessageInsert = useCallback((message: Message) => {
    console.log('📨 [REALTIME] ========== handleMessageInsert EJECUTADO ==========')
    console.log('📨 [REALTIME] Nuevo mensaje recibido:', message)
    console.log('📨 [REALTIME] Mensaje ID:', message.id)
    console.log('📨 [REALTIME] Conversación ID del mensaje:', message.conversation_id)
    console.log('📨 [REALTIME] Conversación seleccionada actual:', selectedConversationId)
    console.log('📨 [REALTIME] Usuario scrolleando:', isUserScrolling)
    console.log('📨 [REALTIME] Contenido del mensaje:', message.content?.substring(0, 100))
    
    const isSelected = message.conversation_id === selectedConversationId

    // ✅ SIEMPRE: Agregar mensaje a conversación seleccionada
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
      console.log('📨 [REALTIME] Mensaje no es de la conversación seleccionada, actualizando conversación')
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
    
    // ✅ FIX CRÍTICO: SIEMPRE actualizar último mensaje, incluso si isUserScrolling está en true
    // El modo scroll solo afecta si mueve la conversación al inicio, pero SIEMPRE debe actualizar los datos
    // ✅ FIX: Eliminar condición de carrera - manejar todo dentro de un solo setConversations
    console.log('📨 [REALTIME] Actualizando conversación con último mensaje')
    
    setConversations(prevConversations => {
      const index = prevConversations.findIndex(c => c.id === message.conversation_id)
      console.log('📨 [REALTIME] Buscando conversación', message.conversation_id, 'en estado actual. Índice:', index)
      
      if (index !== -1) {
        // ✅ CASO 1: Conversación existe → Actualizarla
        const target = prevConversations[index]
        console.log('📨 [REALTIME] Conversación encontrada en índice', index, '- actualizando datos del último mensaje')
        const updatedTarget = {
          ...target,
          last_message_sender_role: message.sender_role,
          last_message_at: message.created_at,
          last_message_content: message.content,
          updated_at: message.created_at,
        } as any
        
        if (isUserScrolling) {
          // 🔄 MODO SCROLL: Solo actualizar en su lugar, NO mover (pero SÍ actualizar los datos)
          console.log('📨 [REALTIME] Modo scroll: actualizando conversación en su lugar sin mover')
          const newConversations = [...prevConversations]
          newConversations[index] = updatedTarget
          console.log('📨 [REALTIME] Estado actualizado en modo scroll. Nuevo último mensaje:', updatedTarget.last_message_content?.substring(0, 50))
          return newConversations
        } else {
          // 🔄 MODO NORMAL: Actualizar Y mover al inicio
          console.log('📨 [REALTIME] Modo normal: actualizando y moviendo conversación al inicio')
          const rest = prevConversations.filter((c, i) => i !== index)
          console.log('📨 [REALTIME] Estado actualizado y movido al inicio. Nuevo último mensaje:', updatedTarget.last_message_content?.substring(0, 50))
          return [updatedTarget, ...rest]
        }
      }

      // ✅ CASO 2: Conversación NO existe → Agregar placeholder INMEDIATAMENTE
      console.log('📨 [REALTIME] Conversación no encontrada en estado actual, agregando placeholder')
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
      
      // Buscar la conversación completa en background (fuera del setState para evitar bloquear)
      setTimeout(() => {
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
      }, 0)
      
      // Retornar el array con el placeholder agregado
      return [placeholder, ...prevConversations]
    })

    // ✅ ELIMINADO: Refresco automático que causaba saltos en el scroll
    // El refresco automático se ha eliminado para evitar interrupciones del scroll infinito
    // Las actualizaciones de tiempo real son suficientes para mantener la sincronización
  }, [selectedConversationId, fetchMessages, fetchConversations, isUserScrolling])

  const handleConversationInsert = useCallback((conversation: Conversation) => {
    console.log('🆕 [REALTIME] Nueva conversación recibida:', conversation)
    console.log('🆕 [REALTIME] Usuario scrolleando:', isUserScrolling)
    
    setConversations(prevConversations => {
      // Evitar duplicados
      if (prevConversations.some(c => c.id === conversation.id)) {
        console.log('🆕 [REALTIME] Conversación duplicada, ignorando')
        return prevConversations
      }
      
      if (isUserScrolling) {
        // 🔄 MODO SCROLL: Agregar al final + indicador
        console.log('🆕 [REALTIME] Modo scroll: agregando conversación al final')
        setNewConversationIds(prev => new Set([...prev, conversation.id]))
        return [...prevConversations, conversation]
      } else {
        // 🔄 MODO NORMAL: Agregar al inicio (comportamiento actual)
        console.log('🆕 [REALTIME] Modo normal: agregando conversación al inicio')
        return [conversation, ...prevConversations]
      }
    })
  }, [isUserScrolling])

  const handleConversationUpdate = useCallback((conversation: Conversation) => {
    console.log('🔄 [REALTIME] Conversación actualizada:', conversation)
    console.log('🔄 [REALTIME] Usuario scrolleando:', isUserScrolling)
    console.log('🔄 [REALTIME] Estado anterior vs nuevo:', {
      id: conversation.id,
      newStatus: conversation.status,
      newAgent: conversation.assigned_agent_name
    })
    
    setConversations(prevConversations => {
      const prevConversation = prevConversations.find(c => c.id === conversation.id)
      console.log('🔄 [REALTIME] Estado anterior en local:', prevConversation ? {
        status: prevConversation.status,
        agent: prevConversation.assigned_agent_name
      } : 'No encontrada')
      
      const index = prevConversations.findIndex(conv => conv.id === conversation.id)
      
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
        
        if (isUserScrolling) {
          // 🔄 MODO SCROLL: Solo actualizar en su lugar
          console.log('🔄 [REALTIME] Modo scroll: actualizando conversación en su lugar')
          const updated = [...prevConversations]
          updated[index] = newObj as any
          return updated
        } else {
          // 🔄 MODO NORMAL: Actualizar Y mover al inicio
          console.log('🔄 [REALTIME] Modo normal: moviendo conversación al inicio')
          const rest = prevConversations.filter((_, i) => i !== index)
          return [newObj as any, ...rest]
        }
      } else {
        // Si no existe en el estado, insertarla
        console.log('🆕 [REALTIME] Conversación no estaba en estado. Agregando por UPDATE:', conversation.id)
        const newConversation = {
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
        } as any
        
        if (isUserScrolling) {
          // 🔄 MODO SCROLL: Agregar al final + indicador
          setNewConversationIds(prev => new Set([...prev, conversation.id]))
          return [...prevConversations, newConversation]
        } else {
          // 🔄 MODO NORMAL: Agregar al inicio
          return [newConversation, ...prevConversations]
        }
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
  }, [fetchMessages, selectedConversationId, isUserScrolling])

  // Usar el hook de tiempo real
  console.log('🔌 [REALTIME] Configurando hook useRealtimeConversations...', {
    hasHandleMessageInsert: !!handleMessageInsert,
    hasHandleConversationInsert: !!handleConversationInsert,
    hasHandleConversationUpdate: !!handleConversationUpdate,
    userId: p?.id,
    clientId: clientId
  })
  useRealtimeConversations({
    onMessageInsert: handleMessageInsert,
    onConversationInsert: handleConversationInsert,
    onConversationUpdate: handleConversationUpdate,
    userId: (p?.id as string | undefined),
    clientId: clientId
  })
  console.log('🔌 [REALTIME] Hook useRealtimeConversations configurado')

  // Initial fetch
  useEffect(() => {
    console.log('🚀 useEffect initial fetch triggered')
    console.log('👤 User:', user)
    console.log('👤 Profile:', profile)
    console.log('👤 isProfileReady:', isProfileReady)
    console.log('👤 clientId:', clientId)
    console.log('🔄 isInitialized:', isInitialized)
    console.log('📊 conversations.length:', conversations.length)
    
    // Dispara si:
    // - user y profile están listos
    // - Y (nunca se inicializó) O (la lista está vacía por cualquier razón)
    if (user && isProfileReady && (!isInitialized || conversations.length === 0)) {
      console.log('✅ User/profile ready y lista vacía o no inicializada → fetching conversations')
      fetchConversations()
    } else if (!user || !isProfileReady) {
      console.log('❌ User or profile not ready yet')
      setIsInitialized(false)
    } else if (isInitialized) {
      console.log('⏭️ Already initialized and conversations present, skipping fetch')
    }
  }, [user, isProfileReady, clientId, isInitialized, fetchConversations, conversations.length])

  // Safety fetch: Si después de configurar suscripciones aún no hay conversaciones, forzar carga
  useEffect(() => {
    // Esperar a que se configuren suscripciones; si no hay conversaciones, disparar fetch
    const t = setTimeout(() => {
      if (user && isProfileReady && conversations.length === 0 && isInitialized) {
        console.log('🛟 Safety fetch: conversaciones siguen vacías tras suscripción → fetchConversations()')
        fetchConversations()
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [user, isProfileReady, clientId, conversations.length, isInitialized, fetchConversations])

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
    clearSelectedConversation,
    loadMore,
    loadingMore,
    hasMore,
    searchConversations,
    isSearching,
    searchQuery,
    currentPage,
    // Nuevos estados y funciones para control inteligente
    isUserScrolling,
    newConversationIds,
    handleScrollStateChange
  }
}