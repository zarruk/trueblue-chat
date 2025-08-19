
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Paperclip, Smile, ChevronDown, PanelRightOpen, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useAgents } from '@/hooks/useAgents'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { MessageTemplatesSuggestions } from '@/components/MessageTemplatesSuggestions'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
// Notificaciones deshabilitadas
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const

interface ChatWindowProps {
  conversationId?: string
  messages?: any[]
  loading?: boolean
  onSendMessage?: (conversationId: string, content: string, role: string) => Promise<void>
  onSelectConversation?: (conversationId: string) => void
  onUpdateConversationStatus?: (conversationId: string, status: Conversation['status']) => Promise<void>
  onAssignAgent?: (conversationId: string, agentId: string) => Promise<void>
  conversations?: Conversation[]
  showContextToggle?: boolean
  onToggleContext?: () => void
  onMobileBack?: () => void
}

interface Message {
  id: string
  content: string
  sender_role: 'user' | 'ai' | 'agent'
  agent_email?: string
  agent_name?: string
  created_at: string
  metadata?: any
}

interface Conversation {
  id: string
  status: 'active_ai' | 'active_human' | 'closed' | 'pending_human'
  user_id: string
  username?: string
  phone_number?: string
  assigned_agent_id?: string
  assigned_agent_email?: string
  assigned_agent_name?: string
  created_at: string
  updated_at: string
}

export function ChatWindow({ conversationId, messages: propMessages, loading: propLoading, onSendMessage, onSelectConversation, onUpdateConversationStatus, onAssignAgent, conversations: propConversations, showContextToggle, onToggleContext, onMobileBack }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [historicalConversations, setHistoricalConversations] = useState<Array<{ id: string; created_at: string; updated_at: string; messages: Message[] }>>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | undefined>(undefined)
  const [viewerError, setViewerError] = useState(false)
  // Índice de variante de imagen por mensaje (para fallbacks)
  const [imageVariantIndex, setImageVariantIndex] = useState<Record<string, number>>({})
  // Errores de carga por imagen (por id de mensaje)
  const [imageError, setImageError] = useState<Record<string, string | undefined>>({})
  // Estado del popover de emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()
  const { getAvailableAgents } = useAgents()

  // Usar props como fuente de verdad
  const messages = propMessages || []
  const loading = propLoading !== undefined ? propLoading : false

  // Obtener la conversación actual directamente del hook para sincronización inmediata
  const conversation = useMemo(() => {
    const source = propConversations
    if (!conversationId || !source) return null
    return source.find(conv => conv.id === conversationId) || null
  }, [conversationId, propConversations])

  // Obtener lista de agentes disponibles para asignación
  const availableAgents = useMemo(() => {
    return getAvailableAgents()
  }, [getAvailableAgents])

  // Normaliza URLs de Google Drive a un formato embebible (uc?export=view&id=FILE_ID)
  function normalizeDriveUrl(url: string): string {
    try {
      const u = new URL(url)
      const isDrive = u.hostname.includes('drive.google.com')
      if (!isDrive) return url

      // Caso 1: /file/d/FILE_ID/view
      const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)\//)
      if (fileMatch && fileMatch[1]) {
        const id = fileMatch[1]
        return `https://drive.google.com/uc?export=view&id=${id}`
      }

      // Caso 2: /open?id=FILE_ID o /thumbnail?id=FILE_ID
      const possibleId = u.searchParams.get('id')
      if (possibleId) {
        return `https://drive.google.com/uc?export=view&id=${possibleId}`
      }

      // Caso 3: /uc?id=FILE_ID&export=download -> export=view
      if (u.pathname.startsWith('/uc')) {
        const id = u.searchParams.get('id')
        if (id) {
          return `https://drive.google.com/uc?export=view&id=${id}`
        }
      }

      return url
    } catch {
      return url
    }
  }

  // Helper para extraer image_url de metadata (img-url o imgUrl) y normalizar Drive
  function getImageCandidatesFromMetadata(metadata: any): string[] {
    try {
      if (!metadata) return []
      let raw: string | undefined
      if (typeof metadata === 'string') {
        const trimmed = metadata.trim()
        if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') return []
        // Si parece JSON, intentar parsear
        if (/^[{\[]/.test(trimmed)) {
          const parsed = JSON.parse(trimmed)
          raw = parsed?.['img-url'] || parsed?.imgUrl
        } else {
          raw = trimmed
        }
      } else if (typeof metadata === 'object') {
        raw = (metadata as any)?.['img-url'] || (metadata as any)?.imgUrl
      }
      if (!raw) return []

      try {
        let candidate = raw
        // Agregar esquema si viene como www.domain.com/... 
        if (!/^https?:\/\//i.test(candidate) && /^([\w-]+\.)+[\w-]{2,}/.test(candidate)) {
          candidate = `https://${candidate}`
        }
        const u = new URL(candidate)
        // Evitar antiguos endpoints privados (wati) si aún persisten en datos históricos
        if (u.hostname.includes('wati.io')) return []
        const isDrive = u.hostname.includes('drive.google.com')
        const isLh3 = u.hostname.includes('lh3.googleusercontent.com')
        if (isDrive) {
          // generar candidatos
          const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)\//)
          const id = fileMatch?.[1] || u.searchParams.get('id') || ''
          if (id) {
            return [
              `https://drive.google.com/uc?export=view&id=${id}`,
              `https://drive.google.com/uc?export=download&id=${id}`,
              `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
              `https://lh3.googleusercontent.com/d/${id}=s1200`
            ]
          }
          return []
        }
        if (isLh3) {
          return [candidate]
        }
        // Aceptar otras URLs sólo si parecen imagen por extensión
        const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(u.pathname)
        return hasImageExt ? [candidate] : []
      } catch {
        // raw no es URL válida
      }
      return []
    } catch (e) {
      console.warn('⚠️ [ChatWindow] No se pudo parsear metadata de mensaje:', e)
      return []
    }
  }

  // Sincronizar conversación seleccionada y cargar mensajes cuando cambia conversationId
  useEffect(() => {
    if (!conversationId) return
    const selectFn = onSelectConversation
    if (selectFn) {
      console.log('🔄 ChatWindow: Selecting conversation for realtime + loading messages:', conversationId)
      selectFn(conversationId)
    }
  }, [conversationId, onSelectConversation])

  // Update local messages when propMessages change (evitar deps inestables)
  useEffect(() => {
    setLocalMessages(propMessages || [])
  }, [propMessages])

  // Cargar historial de todas las conversaciones previas del mismo usuario (excluyendo la actual)
  const fetchHistoricalConversations = useCallback(async (userId: string, currentConvId: string) => {
    try {
      const { data: convs, error: convsError } = await supabase
        .from('tb_conversations')
        .select('id, created_at, updated_at')
        .eq('user_id', userId)
        .neq('id', currentConvId)
        .order('created_at', { ascending: true })

      if (convsError) {
        console.error('❌ [ChatWindow] Error obteniendo conversaciones históricas:', convsError)
        setHistoricalConversations([])
        return
      }

      const results: Array<{ id: string; created_at: string; updated_at: string; messages: Message[] }> = []
      for (const c of convs || []) {
        const { data: msgs, error: msgsError } = await supabase
          .from('tb_messages')
          .select('*')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: true })
        if (msgsError) {
          console.error('❌ [ChatWindow] Error obteniendo mensajes históricos:', msgsError)
          continue
        }
        results.push({ id: c.id, created_at: c.created_at as any, updated_at: c.updated_at as any, messages: (msgs as any) || [] })
      }

      setHistoricalConversations(results)
    } catch (e) {
      console.error('❌ [ChatWindow] Excepción cargando historial:', e)
      setHistoricalConversations([])
    }
  }, [])

  useEffect(() => {
    if (conversation && conversation.user_id) {
      fetchHistoricalConversations(conversation.user_id, conversation.id)
    } else {
      setHistoricalConversations([])
    }
  }, [conversation?.id, conversation?.user_id, fetchHistoricalConversations])

  // Realtime subscription scoped to this conversation as a fail-safe
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat-window-messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tb_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMessage = payload.new as unknown as Message
          setLocalMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tb_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updatedMessage = payload.new as unknown as Message
          setLocalMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m))
        }
      )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ [ChatWindow] Suscripción en tiempo real activa para conversación', conversationId)
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId])

  // Polling de respaldo cada 2.5s para garantizar mensajes en tiempo real si falla la suscripción
  useEffect(() => {
    if (!conversationId) return

    let isCancelled = false
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('tb_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('❌ [ChatWindow] Polling mensajes error:', error)
          return
        }

        if (!isCancelled && Array.isArray(data)) {
          setLocalMessages(prev => {
            if (prev.length === data.length) return prev
            // Merge simple por id
            const byId = new Map(prev.map(m => [m.id, m]))
            for (const m of data as any[]) {
              byId.set(m.id, m as any)
            }
            return Array.from(byId.values()).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          })
        }
      } catch (e) {
        console.error('❌ [ChatWindow] Polling mensajes excepción:', e)
      }
    }, 2500)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [conversationId])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
    }
  }, [])

  const scrollToBottomInstant = useCallback(() => {
    scrollToBottom('auto')
  }, [scrollToBottom])

  useEffect(() => {
    // Scroll instantáneo cuando se cargan mensajes inicialmente
    if (localMessages.length > 0) {
      scrollToBottomInstant()
    }
  }, [localMessages.length, scrollToBottomInstant])

  // Scroll suave cuando se agregan nuevos mensajes
  useEffect(() => {
    if (localMessages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom('smooth')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [localMessages, scrollToBottom])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !conversationId) return

    try {
      if (!onSendMessage) throw new Error('onSendMessage no definido')
      await onSendMessage(conversationId, message, 'agent')
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!conversationId) return

    try {
      setUpdatingStatus(true)
      console.log('🔄 ChatWindow: Iniciando cambio de estado:', { conversationId, newStatus })
      
      if (!onUpdateConversationStatus) throw new Error('onUpdateConversationStatus no definido')
      await onUpdateConversationStatus(conversationId, newStatus as Conversation['status'])
      
      console.log('✅ ChatWindow: Status actualizado')
      
      // 🚀 FORZAR ACTUALIZACIÓN INMEDIATA DE CONVERSACIONES
      // Las conversaciones se actualizan automáticamente vía tiempo real
      
      // Los cambios se reflejan automáticamente vía tiempo real
      
    } catch (error) {
      console.error('❌ ChatWindow: Error updating conversation status:', error)
      toast.error('Error al actualizar el estado de la conversación')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAssignAgent = async (agentId: string) => {
    if (!conversationId) return

    console.log('🎯 ChatWindow: handleAssignAgent iniciado:', { conversationId, agentId })

    try {
      if (agentId === "none") {
        // Desasignar conversación - cambiar a IA
        console.log('🤖 ChatWindow: Desasignando conversación (cambiar a IA):', conversationId)
        if (!onUpdateConversationStatus) throw new Error('onUpdateConversationStatus no definido')
        await onUpdateConversationStatus(conversationId, 'active_ai')
        console.log('✅ ChatWindow: Conversación desasignada exitosamente')
        toast.success('Conversación desasignada y regresada a IA')
      } else {
        // Asignar a agente específico
        console.log('👤 ChatWindow: Asignando agente:', { conversationId, agentId })
        const agent = availableAgents.find(a => a.id === agentId)
        console.log('🔍 ChatWindow: Agente encontrado:', agent)
        if (!onAssignAgent) throw new Error('onAssignAgent no definido')
        await onAssignAgent(conversationId, agentId)
        console.log('✅ ChatWindow: Agente asignado exitosamente')
        // Aviso centralizado en hook superior (evitar duplicados)
      }
      
      // 🚀 FORZAR ACTUALIZACIÓN INMEDIATA DE CONVERSACIONES
      // Las conversaciones se actualizan automáticamente vía tiempo real
      
      // Los cambios se reflejan automáticamente vía tiempo real
      
    } catch (error) {
      console.error('❌ ChatWindow: Error al asignar/desasignar agente:', error)
      toast.error('Error al modificar la asignación')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active_ai':
        return 'default'
      case 'active_human':
        return 'secondary'
      case 'closed':
        return 'destructive'
      case 'pending_human':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active_ai':
        return '🤖 IA Activa'
      case 'active_human':
        return '👤 Agente Activo'
      case 'closed':
        return '🔒 Cerrada'
      case 'pending_human':
        return '⏳ Pendiente'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active_ai':
        return 'text-blue-600'
      case 'active_human':
        return 'text-green-600'
      case 'closed':
        return 'text-red-600'
      case 'pending_human':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getSenderInfo = (msg: Message) => {
    if (msg.sender_role === 'agent') {
      return {
        name: msg.agent_name || 'Agente',
        avatar: msg.agent_email === profile?.email ? undefined : undefined,
        isCurrentUser: msg.agent_email === profile?.email
      }
    }
    return {
      name: msg.sender_role === 'user' ? 'Usuario' : 'IA',
      avatar: undefined,
      isCurrentUser: false
    }
  }

  const getMessageAlignment = (msg: Message) => {
    // Los mensajes de 'user' van a la izquierda, 'ai' y 'agent' van a la derecha
    return msg.sender_role === 'user' ? 'justify-start' : 'justify-end'
  }

  const renderMessageBubble = (msg: Message, muted = false) => {
    const senderInfo = getSenderInfo(msg)
    const alignment = getMessageAlignment(msg)
    const candidates = getImageCandidatesFromMetadata(msg?.metadata)
    const idx = imageVariantIndex[msg.id] || 0
    const imageUrl = candidates[idx]
    const hasImage = Boolean(imageUrl)

    return (
      <div key={msg.id} className={`flex ${alignment}`}>
        <div className={`flex items-start space-x-3 max-w-[70%] ${alignment === 'justify-end' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {msg.sender_role === 'user' && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={senderInfo.avatar} />
              <AvatarFallback>
                {senderInfo.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className={`rounded-lg px-4 py-2 ${
            msg.sender_role === 'user'
              ? 'bg-muted'
              : 'bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 text-slate-900 border border-indigo-100 dark:from-indigo-500 dark:via-violet-500 dark:to-fuchsia-500 dark:text-white'
          } ${muted ? 'opacity-85 dark:opacity-95' : ''}`}>
            {hasImage && (
              <div className="mb-2">
                <img 
                  key={`${msg.id}-${idx}`}
                  src={imageUrl} 
                  alt="imagen adjunta" 
                  className="rounded-md cursor-zoom-in max-w-full h-auto max-h-72 object-contain w-auto"
                  loading="lazy"
                  onClick={() => { setViewerSrc(imageUrl); setViewerError(false); setViewerOpen(true) }}
                  onError={(e) => {
                    const next = (imageVariantIndex[msg.id] || 0) + 1
                    if (candidates && next < candidates.length) {
                      setImageVariantIndex(prev => ({ ...prev, [msg.id]: next }))
                    } else {
                      console.error('❌ [ChatWindow] Error final al cargar la imagen:', imageUrl, candidates)
                      setImageError(prev => ({ ...prev, [msg.id]: 'Error al cargar la imagen.' }))
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }
                  }}
                />
              </div>
            )}
            {msg.content && (
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            )}
            <p className={`text-xs mt-1 ${
              msg.sender_role === 'user'
                ? 'text-muted-foreground'
                : 'text-indigo-700/80 dark:text-white/80'
            }`}>
              {msg.sender_role !== 'user' && (
                <>
                  {(msg.agent_name && msg.agent_name.trim()) || (msg.sender_role === 'agent' ? 'Agente' : 'IA')} ·{' '}
                </>
              )}
              {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Selecciona una conversación</h3>
          <p className="text-muted-foreground">
            Elige una conversación del panel izquierdo para comenzar a chatear
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Chat Header */}
      <div className="border-b dark:border-slate-700 px-4 xl:px-6 py-3 xl:py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {/* Botón volver en móvil */}
            {onMobileBack && (
              <Button variant="ghost" size="icon" className="xl:hidden mr-1" onClick={onMobileBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {conversation?.username?.charAt(0)?.toUpperCase() || 
                 conversation?.phone_number?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {conversation?.username || conversation?.phone_number || `Conversación #${conversationId?.slice(0, 8)}`}
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant={getStatusBadgeVariant(conversation?.status || 'closed')}>
                  {getStatusLabel(conversation?.status || 'Cerrada')}
                </Badge>
                {conversation?.assigned_agent_name && (
                  <span className="text-sm text-muted-foreground">
                    Agente: {conversation.assigned_agent_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Status Selector and Context Toggle */}
          <div className="hidden xl:flex items-center space-x-4">
            {showContextToggle && onToggleContext && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleContext}
                className="items-center gap-2"
              >
                <PanelRightOpen className="h-4 w-4" />
                Contexto
              </Button>
            )}
            
            <div className="flex flex-col items-end space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Estado de la conversación
              </label>
              <div className="flex items-center space-x-2">
                <Select 
                  onValueChange={handleStatusChange} 
                  value={conversation?.status || 'closed'}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="Cambiar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_human">⏳ Pendiente</SelectItem>
                    <SelectItem value="active_ai">🤖 IA Activa</SelectItem>
                    <SelectItem value="active_human">👤 Agente Activo</SelectItem>
                    <SelectItem value="closed">🔒 Cerrada</SelectItem>
                  </SelectContent>
                </Select>
                {updatingStatus && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Botón para tomar conversación */}
        {conversation && conversation.status !== 'active_human' && conversation.status !== 'pending_human' && (
          <div className="p-2 border-b bg-muted/20 dark:border-slate-700">
            <Button 
              onClick={async () => {
                if (!profile?.id || !conversationId) return
                
                try {
                  console.log('🎯 ChatWindow: Botón "Tomar conversación" presionado')
                  console.log('🎯 ChatWindow: conversationId:', conversationId)
                  console.log('🎯 ChatWindow: profile.id:', profile.id)
                  console.log('🎯 ChatWindow: Estado actual de la conversación ANTES:', conversation)
                  
                  // Asignar la conversación al agente actual usando el flujo unificado
                  await handleAssignAgent(profile.id)
                  
                  console.log('🎯 ChatWindow: handleAssignAgent completado exitosamente')
                  
                  // Verificar el estado después de un breve delay
                  setTimeout(() => {
                    console.log('🎯 ChatWindow: Verificando estado DESPUÉS de tomar conversación:', conversation)
                  }, 200)
                  
                  // Éxito gestionado por hooks superiores (evitar toasts duplicados)
                } catch (error) {
                  console.error('❌ ChatWindow: Error al tomar la conversación:', error)
                  toast.error('Error al tomar la conversación')
                }
              }}
              size="sm"
              variant="default"
              className="w-full"
              disabled={!profile?.id}
            >
              🎯 Tomar conversación
            </Button>
          </div>
        )}
        
        <div 
          ref={messagesContainerRef} 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 space-y-4 chat-messages-scroll dark:[&>.message-sep]:border-slate-700"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Historial de conversaciones anteriores */}
              {historicalConversations.map((conv, idx) => (
                <div key={conv.id} className="space-y-3">
                  <div className="relative my-6 message-sep">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-dashed border-muted-foreground/30" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Histórico • {format(new Date(conv.created_at), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>
                  {conv.messages.map((m) => renderMessageBubble(m, true))}
                </div>
              ))}

              {/* Mensajes de la conversación actual */}
              {localMessages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
                </div>
              ) : (
                localMessages.map((msg) => renderMessageBubble(msg, false))
              )}
            </>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t dark:border-slate-700 p-3 flex-shrink-0 space-y-2">
        <MessageTemplatesSuggestions 
          currentUserName={profile?.name || 'Agente'}
          onSelectTemplate={(tpl) => {
            setMessage(prev => (prev ? prev + '\n' : '') + tpl.message)
          }}
        />
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 z-50">
              <Picker 
                data={data as any}
                onEmojiSelect={(emoji: any) => {
                  const native = emoji?.native || ''
                  setMessage(prev => prev + native)
                  setShowEmojiPicker(false)
                }}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                locale="es"
              />
            </PopoverContent>
          </Popover>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            disabled={!conversationId}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e as any)
              }
            }}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '40px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          <Button type="submit" size="icon" disabled={!message.trim() || !conversationId}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Visor de imagen ampliada */}
      <Dialog open={viewerOpen} onOpenChange={(o)=>{ 
        setViewerOpen(o); 
        if(!o){ setViewerError(false); setViewerSrc(undefined); }
      }}>
        <DialogContent className="sm:max-w-[92vw] p-0 border bg-background/90 backdrop-blur">
          <DialogTitle className="sr-only">Visor de imagen</DialogTitle>
          <DialogDescription className="sr-only">Imagen adjunta ampliada</DialogDescription>
          <div className="max-w-[92vw] max-h-[85vh] w-[92vw] flex items-center justify-center p-2">
            {!viewerError && viewerSrc && (
              <img 
                src={viewerSrc} 
                alt="imagen"
                className="max-w-full max-h-[82vh] object-contain rounded-md"
                onError={() => setViewerError(true)}
              />
            )}
            {!viewerSrc || viewerError ? (
              <div className="text-sm text-destructive">No se pudo cargar la imagen</div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
