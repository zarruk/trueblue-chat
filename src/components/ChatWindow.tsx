import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Paperclip, Smile, ChevronDown, PanelRightOpen, ChevronLeft, X, FileText, Download, Image as ImageIcon, Loader2 } from 'lucide-react'
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
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { MessageTemplatesSuggestions } from '@/components/MessageTemplatesSuggestions'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { uploadFile, validateFile } from '@/services/fileUploadService'
// Notificaciones deshabilitadas
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const

// Helper para formatear separadores de fecha
function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return 'Hoy'
  }
  if (isYesterday(date)) {
    return 'Ayer'
  }
  return format(date, "d 'de' MMMM", { locale: es })
}

interface ChatWindowProps {
  conversationId?: string
  messages?: any[]
  loading?: boolean
  onSendMessage?: (conversationId: string, content: string, role: string, metadata?: any) => Promise<void>
  onSelectConversation?: (conversationId: string) => void
  onUpdateConversationStatus?: (conversationId: string, status: Conversation['status']) => Promise<void>
  onAssignAgent?: (conversationId: string, agentId: string) => Promise<void>
  conversations?: Conversation[]
  showContextToggle?: boolean
  onToggleContext?: () => void
  onMobileBack?: () => void
  fetchOlderMessages?: () => Promise<boolean>
  hasMoreHistory?: boolean
  loadingHistory?: boolean
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
  status: 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'
  user_id: string
  username?: string
  phone_number?: string
  assigned_agent_id?: string
  assigned_agent_email?: string
  assigned_agent_name?: string
  created_at: string
  updated_at: string
  channel?: string
}

export function ChatWindow({ conversationId, messages: propMessages, loading: propLoading, onSendMessage, onSelectConversation, onUpdateConversationStatus, onAssignAgent, conversations: propConversations, showContextToggle, onToggleContext, onMobileBack, fetchOlderMessages, hasMoreHistory, loadingHistory }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | undefined>(undefined)
  const [viewerError, setViewerError] = useState(false)
  // Índice de variante de imagen por mensaje (para fallbacks)
  const [imageVariantIndex, setImageVariantIndex] = useState<Record<string, number>>({})
  // Errores de carga por imagen (por id de mensaje)
  const [imageError, setImageError] = useState<Record<string, string | undefined>>({})
  // Estado del popover de emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Estados para adjuntar archivos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()
  const { getAvailableAgents } = useAgents()
  
  const prevScrollHeight = useRef(0)
  
  // Estados para detección de scroll manual del usuario
  const [userIsScrolling, setUserIsScrolling] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // ✅ NUEVO: Estado para rastrear último scroll manual (período de gracia)
  const [lastManualScrollTime, setLastManualScrollTime] = useState<number>(0)
  // ✅ NUEVO: Guard local para evitar cargas duplicadas de historial
  const loadingOlderRef = useRef(false)
  
  // 🔧 FIX: Flag específico para bloquear scroll automático durante carga de historial
  const [isLoadingHistoricalMessages, setIsLoadingHistoricalMessages] = useState(false)
  
  // ✅ Sincronizar bandera local con prop del padre
  useEffect(() => {
    setIsLoadingHistoricalMessages(!!loadingHistory)
  }, [loadingHistory])

  // 🔧 FIX: Unificar estado de mensajes fusionando servidor + realtime sin duplicados (prioriza servidor)
  const messages = useMemo(() => {
    const base = Array.isArray(propMessages) ? propMessages : []
    if (!Array.isArray(localMessages) || localMessages.length === 0) return base
    const byId = new Map(base.map((m: any) => [m?.id, m]))
    for (const m of localMessages) {
      const id = (m as any)?.id
      if (!byId.has(id)) byId.set(id, m)
    }
    return Array.from(byId.values())
  }, [propMessages, localMessages])
  
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

  // Helper: extraer URL de imagen desde metadata y normalizar Drive
  function getImageUrlFromMetadata(metadata: any): string | undefined {
    try {
      if (!metadata) return undefined
      let url: string | undefined
      if (typeof metadata === 'string') {
        const trimmed = metadata.trim()
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') return undefined
        if (/^[{\[]/.test(trimmed)) {
          const parsed = JSON.parse(trimmed)
          // ✅ Buscar file-url además de img-url
          url = parsed?.['img-url'] || parsed?.imgUrl || parsed?.['file-url']
        } else {
          url = trimmed
        }
      } else if (typeof metadata === 'object') {
        // ✅ Buscar file-url además de img-url
        url = (metadata as any)?.['img-url'] || (metadata as any)?.imgUrl || (metadata as any)?.['file-url']
      }
      if (!url) return undefined
      
      // ✅ Verificar que sea una imagen si hay file-type
      if (typeof metadata === 'object' && (metadata as any)?.['file-type']) {
        const fileType = (metadata as any)?.['file-type']
        if (!fileType.startsWith('image/')) {
          return undefined // No es una imagen, se mostrará en la sección de documentos
        }
      }
      
      // Normalizar esquema si viene sin http(s)
      if (!/^https?:\/\//i.test(url) && /^([\w-]+\.)+[\w-]{2,}/.test(url)) {
        url = `https://${url}`
      }
      // Normalizar URLs de Google Drive a uc?export=view&id=
      const googleDriveMatch = url.match(/(?:id=|file\/d\/|drive\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/)
      if (googleDriveMatch && googleDriveMatch[1]) {
        const fileId = googleDriveMatch[1]
        return `https://drive.google.com/uc?export=view&id=${fileId}`
      }
      return url
    } catch (e) {
      console.warn('⚠️ [ChatWindow] No se pudo parsear metadata de mensaje:', e)
      return undefined
    }
  }

  // COMENTADO: Llamada redundante a selectConversation
  // Dashboard ya maneja la selección de conversaciones, ChatWindow solo necesita mostrar los datos
  // useEffect(() => {
  //   if (!conversationId) return
  //   if (onSelectConversation) {
  //     console.log('🔄 ChatWindow: Selecting conversation for realtime + loading messages:', conversationId)
  //     onSelectConversation(conversationId)
  //   }
  // }, [conversationId])

  // Update local messages when propMessages change (evitar deps inestables)
  useEffect(() => {
    setLocalMessages(propMessages || [])
  }, [propMessages])

  // Detectar scroll hacia arriba para cargar mensajes más antiguos + detección de scroll manual
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current
    if (!container) return

    // 🔧 NUEVO: Detectar si el usuario está cerca del final (últimos 100px)
    const scrollFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isAtBottom = scrollFromBottom < 100
    setIsNearBottom(isAtBottom)
    
    // Detectar scroll hacia arriba (cerca del inicio)
    const isAtTop = container.scrollTop < 100
    
    if (isAtTop && !loadingOlderRef.current && !loadingHistory && hasMoreHistory && fetchOlderMessages) {
      console.log('🔼 ChatWindow: Scroll al inicio, cargando historial...')
      const prevScrollHeight = container.scrollHeight
      
      loadingOlderRef.current = true
      const success = await fetchOlderMessages()
      
      if (success) {
        // Mantener posición de scroll después de cargar
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollHeight
          }
        })
      }
      loadingOlderRef.current = false
    }
    
    // 🔧 NUEVO: Detectar si está scrolleando hacia arriba (alejándose del final)
    if (!isAtBottom) {
      setUserIsScrolling(true)
      // ✅ Actualizar timestamp de último scroll manual
      setLastManualScrollTime(Date.now())
      // 🔧 FIX: NO usar timeout automático - solo restaurar cuando usuario vuelva al final
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      console.log('🔼 ChatWindow: Usuario scrolleando hacia arriba - desactivando scroll automático')
    } else {
      // ✅ Solo restaurar scroll automático cuando usuario vuelva al final por su cuenta
      if (userIsScrolling) {
        setUserIsScrolling(false)
        // ✅ Actualizar timestamp cuando vuelve al final también
        setLastManualScrollTime(Date.now())
        console.log('✅ ChatWindow: Usuario volvió al final, restaurando scroll automático')
      }
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [userIsScrolling, loadingHistory, hasMoreHistory, fetchOlderMessages])

  // Agregar listener de scroll + cleanup de timeouts
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      // 🧹 Cleanup: Limpiar timeout al desmontar
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])
  
  // Cleanup general al desmontar el componente
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])


  // Realtime subscription scoped to this conversation as a fail-safe
  useEffect(() => {
    if (!conversationId) return

    let isMounted = true
    let channel: any = null

    const setupChannel = async () => {
      try {
        // ✅ SOLUCIÓN 1: Limpiar canales WebSocket acumulados antes de crear nuevo
        console.log('🧹 [ChatWindow] Limpiando canales WebSocket acumulados...')
        const existingChannels = supabase.getChannels()
        let cleanedCount = 0
        
        existingChannels.forEach(existingChannel => {
          if (existingChannel.topic.startsWith('chat-window-')) {
            console.log('🧹 [ChatWindow] Limpiando canal huérfano:', existingChannel.topic)
            supabase.removeChannel(existingChannel)
            cleanedCount++
          }
        })
        
        if (cleanedCount > 0) {
          console.log(`🧹 [ChatWindow] Limpiados ${cleanedCount} canales huérfanos`)
        }
        
        // ✅ FIX: Usar nombre único y específico para este canal
        const channelName = `chat-window-${conversationId}-${Date.now()}`
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'tb_messages', filter: `conversation_id=eq.${conversationId}` },
            (payload) => {
              // ✅ FIX: Verificar que el componente sigue montado antes de actualizar estado
              if (!isMounted) return
              
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
              // ✅ FIX: Verificar que el componente sigue montado antes de actualizar estado
              if (!isMounted) return
              
              const updatedMessage = payload.new as unknown as Message
              setLocalMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m))
            }
          )

        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED' && isMounted) {
            console.log('✅ [ChatWindow] Suscripción en tiempo real activa para conversación', conversationId)
          }
        })
      } catch (error) {
        console.error('❌ [ChatWindow] Error setting up realtime channel:', error)
      }
    }

    setupChannel()

    return () => {
      // ✅ FIX: Marcar como desmontado primero para prevenir actualizaciones de estado
      isMounted = false
      
      // ✅ FIX: Limpiar solo el canal específico de este componente
      if (channel) {
        try {
          channel.unsubscribe()
          console.log('🧹 [ChatWindow] Canal limpiado para conversación', conversationId)
        } catch (error) {
          console.warn('⚠️ [ChatWindow] Error al limpiar canal:', error)
        }
      }
      
      // ✅ FIX: NO buscar canales huérfanos - confiar en que cada instancia limpia su propio canal
      // Esto evita interferencia con otros componentes y race conditions
    }
  }, [conversationId]) // ✅ FIX: Re-crear canal cuando cambie la conversación

  // ELIMINADO: No usar polling automático para evitar refrescos

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
    }
  }, [])

  const scrollToBottomInstant = useCallback(() => {
    scrollToBottom('auto')
  }, [scrollToBottom])

  useEffect(() => {
    // 🔧 FIX: NUNCA hacer scroll automático si se están cargando mensajes históricos
    if (isLoadingHistoricalMessages) {
      console.log('🚫 ChatWindow: Scroll automático bloqueado - cargando mensajes históricos')
      return
    }
    
    // ✅ Calcular tiempo desde último scroll manual
    const timeSinceLastScroll = Date.now() - lastManualScrollTime
    const SCROLL_GRACE_PERIOD = 15000 // ✅ 15 segundos de período de gracia
    
    // ✅ Si el usuario ha scrolleado recientemente, NO hacer scroll automático
    if (timeSinceLastScroll < SCROLL_GRACE_PERIOD && lastManualScrollTime > 0) {
      console.log(`🚫 ChatWindow: Scroll automático bloqueado - usuario scrolleó hace ${Math.round(timeSinceLastScroll / 1000)}s (período de gracia: 15s)`)
      return
    }
    
    // Solo scroll automático si:
    // 1. El usuario NO ha scrolleado recientemente (o nunca ha scrolleado)
    // 2. Y está cerca del final O es la primera carga
    if (messages.length > 0 && isNearBottom) {
      // ✅ Delay antes de hacer scroll (período de gracia adicional)
      const timer = setTimeout(() => {
        // ✅ Doble verificación: asegurar que el usuario siga cerca del final y no haya scrolleado
        const timeSinceLastScrollNow = Date.now() - lastManualScrollTime
        if (timeSinceLastScrollNow >= SCROLL_GRACE_PERIOD && isNearBottom && !isLoadingHistoricalMessages) {
          scrollToBottomInstant()
          console.log('📍 ChatWindow: Scroll automático al final (período de gracia completado)')
        } else {
          console.log('📍 ChatWindow: Scroll automático cancelado - usuario scrolleó durante período de gracia')
        }
      }, 2000) // Esperar 2 segundos adicionales antes de hacer scroll
      
      return () => clearTimeout(timer)
    } else if (userIsScrolling && !isNearBottom) {
      console.log('📍 ChatWindow: Scroll automático omitido - usuario scrolleando manualmente y lejos del final')
    }
  }, [messages.length, scrollToBottomInstant, userIsScrolling, isNearBottom, isLoadingHistoricalMessages, lastManualScrollTime])

  // Asegurar scroll al fondo cuando se cambia de conversación
  useEffect(() => {
    if (!conversationId) return
    const t = setTimeout(() => scrollToBottomInstant(), 100)
    return () => clearTimeout(t)
  }, [conversationId, scrollToBottomInstant])

  // 🔧 FIX: Scroll suave cuando se agregan nuevos mensajes (usar mensajes unificados)
  useEffect(() => {
    // 🔧 FIX: NUNCA hacer smooth scroll si se están cargando mensajes históricos
    if (isLoadingHistoricalMessages) {
      console.log('🚫 ChatWindow: Smooth scroll bloqueado - cargando mensajes históricos')
      return
    }
    
    // Solo smooth scroll si el usuario NO está scrolleando y está cerca del final
    if (messages.length > 0 && (!userIsScrolling || isNearBottom)) {
      const timer = setTimeout(() => {
        // Doble verificación para evitar race conditions
        if (!isLoadingHistoricalMessages && (!userIsScrolling || isNearBottom)) {
          scrollToBottom('smooth')
          console.log('📍 ChatWindow: Smooth scroll al final')
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [messages, scrollToBottom, userIsScrolling, isNearBottom, isLoadingHistoricalMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && selectedFiles.length === 0) || !conversationId) return

    try {
      if (!onSendMessage) throw new Error('onSendMessage no definido')
      
      // Si hay archivos, subirlos primero
      if (selectedFiles.length > 0 && profile?.client_id && conversationId) {
        setUploading(true)
        setUploadProgress(0)
        
        const firstFile = selectedFiles[0] // Inicialmente solo 1 archivo
        const result = await uploadFile(
          firstFile,
          profile.client_id,
          conversationId,
          (progress) => setUploadProgress(progress)
        )
        
        setUploading(false)
        
        if (!result.success || !result.metadata) {
          console.error('Error subiendo archivo:', result.error)
          toast.error(result.error || 'Error al subir archivo')
          return
        }
        
        console.log('🔍 ChatWindow: Enviando mensaje con metadata:', result.metadata)
        // El metadata se manejará en el hook de conversaciones
        await onSendMessage(conversationId, message, 'agent', result.metadata)
      } else {
        await onSendMessage(conversationId, message, 'agent')
      }
      
      setMessage('')
      setSelectedFiles([])
      setUploadProgress(0)
    } catch (error) {
      console.error('Error sending message:', error)
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    // Validar cada archivo
    const validFiles: File[] = []
    const errors: string[] = []
    
    files.forEach(file => {
      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    })
    
    if (errors.length > 0) {
      console.error('Errores de validación:', errors)
      errors.forEach(err => toast.error(err))
    }
    
    if (validFiles.length > 0) {
      // Por ahora solo permitir 1 archivo
      setSelectedFiles(validFiles.slice(0, 1))
    }
    
    // Reset del input para permitir seleccionar el mismo archivo otra vez
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
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
      case 'pending_response':
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
      case 'pending_response':
        return '⏳ Esperando Respuesta'
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
      case 'pending_response':
        return 'text-yellow-600'
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
    const baseImageUrl = getImageUrlFromMetadata(msg?.metadata)
    const hasImage = Boolean(baseImageUrl)

    // Variantes para Google Drive (sin hooks dentro del render de burbuja)
    let googleDriveVariants: string[] = []
    if (baseImageUrl && (baseImageUrl.includes('drive.google.com') || baseImageUrl.includes('drive.usercontent.google.com'))) {
      const fileIdMatch = baseImageUrl.match(/(?:id=|file\/d\/)([a-zA-Z0-9_-]+)/)
      if (fileIdMatch) {
        const fileId = fileIdMatch[1]
        googleDriveVariants = [
          // Preferir dominios que no dan CORS en <img>
          `https://lh3.googleusercontent.com/d/${fileId}=s2048`,
          `https://lh3.googleusercontent.com/d/${fileId}`,
          `https://drive.usercontent.google.com/uc?export=view&id=${fileId}`,
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
          `https://drive.google.com/open?id=${fileId}`,
          `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
          // Dejar uc al final porque suele bloquear por CORS
          `https://drive.google.com/uc?export=view&id=${fileId}`,
          `https://drive.google.com/uc?export=download&id=${fileId}`
        ]
      }
    }

    const idx = imageVariantIndex[msg.id] || 0
    const imageUrl = hasImage
      ? (googleDriveVariants.length > 0
          ? googleDriveVariants[idx % googleDriveVariants.length]
          : baseImageUrl)
      : undefined

    return (
      <div key={msg.id} className={`flex ${alignment}`}>
        <div className={`flex items-start space-x-3 max-w-[86%] tablet:max-w-[75%] desktop:max-w-[70%] ${alignment === 'justify-end' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {msg.sender_role === 'user' && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={senderInfo.avatar} />
              <AvatarFallback>
                {senderInfo.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className={`rounded-2xl px-4 py-3 tablet:rounded-lg tablet:px-4 tablet:py-2 ${
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
                  className="chat-message-content rounded-md cursor-zoom-in max-w-full h-auto max-h-72 object-contain w-auto"
                  loading="lazy"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onClick={() => { setViewerSrc(imageUrl); setViewerError(false); setViewerOpen(true) }}
                  onError={(e) => {
                    const next = (imageVariantIndex[msg.id] || 0) + 1
                    if (googleDriveVariants.length > 0 && next < googleDriveVariants.length) {
                      setImageVariantIndex(prev => ({ ...prev, [msg.id]: next }))
                    } else {
                      if (import.meta.env.DEV) {
                        console.warn('❌ [ChatWindow] Error final al cargar la imagen:', imageUrl, googleDriveVariants)
                      }
                      setImageError(prev => ({ ...prev, [msg.id]: 'Error al cargar la imagen.' }))
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }
                  }}
                />
              </div>
            )}
            {/* Mostrar documento adjunto */}
            {!hasImage && msg?.metadata && (() => {
              const fileUrl = (msg.metadata as any)?.['file-url']
              const fileType = (msg.metadata as any)?.['file-type']
              const fileName = (msg.metadata as any)?.['file-name']
              
              if (fileUrl && fileType && fileName) {
                const isImage = fileType.startsWith('image/')
                const isDocument = fileType.startsWith('application/')
                
                if (isDocument) {
                  return (
                    <div className="mb-2">
                      <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted/30 rounded-md hover:bg-muted/70 transition-colors border border-muted"
                      >
                        <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{fileName}</div>
                          <div className="text-xs text-muted-foreground">{fileType}</div>
                        </div>
                        <Download className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </a>
                    </div>
                  )
                } else if (isImage) {
                  return (
                    <div className="mb-2">
                      <img 
                        src={fileUrl} 
                        alt={fileName} 
                        className="chat-message-content rounded-md cursor-zoom-in max-w-full h-auto max-h-72 object-contain w-auto"
                        loading="lazy"
                        onClick={() => { setViewerSrc(fileUrl); setViewerError(false); setViewerOpen(true) }}
                      />
                    </div>
                  )
                }
              }
              return null
            })()}
            {msg.content && (
              <p className="chat-message-content text-[15px] leading-6 tablet:text-sm tablet:leading-5 whitespace-pre-wrap break-words">{msg.content}</p>
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
    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
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
                  {getStatusLabel(conversation?.status || 'closed')}
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
            
            {(() => {
              const isClosed = conversation?.status === 'closed'
              return (
            <div className="flex flex-col items-end space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Estado de la conversación
              </label>
              <div className="flex items-center space-x-2">
                <Select 
                  onValueChange={handleStatusChange} 
                  value={conversation?.status || 'closed'}
                  disabled={updatingStatus || isClosed}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="Cambiar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_human">⏳ Pendiente</SelectItem>
                    <SelectItem value="pending_response">⏳ Esperando Respuesta</SelectItem>
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
              )
            })()}

            {/* Asignación de agente */}
            {(() => {
              const isClosed = conversation?.status === 'closed'
              return (
            <div className="flex flex-col items-end space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Agente asignado
              </label>
              <div className="flex items-center space-x-2">
                <Select
                  onValueChange={(value) => handleAssignAgent(value)}
                  value={conversation?.assigned_agent_id || 'none'}
                  disabled={isClosed}
                >
                  <SelectTrigger className="h-8 w-[220px]">
                    <SelectValue placeholder="Selecciona agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar (volver a IA)</SelectItem>
                    {availableAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} · {a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Mobile Controls - Visible solo en móvil */}
      <div className="xl:hidden border-b dark:border-slate-700 px-4 py-3 flex-shrink-0 bg-muted/20">
        <div className="space-y-3">
          {/* Estado de la conversación */}
          {(() => {
            const isClosed = conversation?.status === 'closed'
            return (
          <div className="flex flex-col space-y-1">
            <label className="text-xs text-muted-foreground font-medium">
              Estado de la conversación
            </label>
            <div className="flex items-center space-x-2">
              <Select 
                onValueChange={handleStatusChange} 
                value={conversation?.status || 'closed'}
                disabled={updatingStatus || isClosed}
              >
                <SelectTrigger className="h-11 min-h-[44px] w-full text-[15px] touch-manipulation">
                  <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_human">⏳ Pendiente</SelectItem>
                  <SelectItem value="pending_response">⏳ Esperando Respuesta</SelectItem>
                  <SelectItem value="active_ai">🤖 IA Activa</SelectItem>
                  <SelectItem value="active_human">👤 Agente Activo</SelectItem>
                  <SelectItem value="closed">🔒 Cerrada</SelectItem>
                </SelectContent>
              </Select>
              {updatingStatus && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
              )}
            </div>
          </div>
            )
          })()}

          {/* Asignación de agente */}
          {(() => {
            const isClosed = conversation?.status === 'closed'
            return (
          <div className="flex flex-col space-y-1">
            <label className="text-xs text-muted-foreground font-medium">
              Agente asignado
            </label>
            <Select
              onValueChange={(value) => handleAssignAgent(value)}
              value={conversation?.assigned_agent_id || 'none'}
              disabled={isClosed}
            >
              <SelectTrigger className="h-11 min-h-[44px] w-full text-[15px] touch-manipulation">
                <SelectValue placeholder="Selecciona agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar (volver a IA)</SelectItem>
                {availableAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            )
          })()}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Botón para tomar conversación (solo cuando está en IA activa) */}
        {conversation && conversation.status === 'active_ai' && (
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
                  
                  // Éxito gestionado por hooks superiores
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
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 tablet:px-4 tablet:py-4 desktop:px-6 desktop:py-6 space-y-3 tablet:space-y-2 desktop:space-y-2 chat-messages-scroll dark:[&>.message-sep]:border-slate-700"
        >
          {/* Indicador de carga de historial */}
          {loadingHistory && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Cargando historial...</span>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Mensajes de la conversación actual */}
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <p>No hay mensajes aún. Sé el primero en escribir.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  // Verificar si necesitamos mostrar un separador de fecha
                  const showDateSeparator = idx === 0 || 
                    !isSameDay(new Date(messages[idx - 1].created_at), new Date(msg.created_at))
                  
                  // Verificar si es inicio de conversación histórica
                  const isHistoricalStart = (msg as any)._isHistoricalStart
                  const historicalDate = (msg as any)._historicalConversationDate
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {/* Separador de conversación histórica */}
                      {isHistoricalStart && historicalDate && (
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t-2 border-muted-foreground/30" />
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="bg-background px-4 py-2 text-muted-foreground font-semibold rounded-full border border-muted-foreground/30">
                              Histórico · {format(new Date(historicalDate), "dd/MM/yyyy", { locale: es })}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Separador de fecha normal */}
                      {showDateSeparator && !isHistoricalStart && (
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted-foreground/20" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-background px-3 py-1 text-muted-foreground font-medium rounded-full">
                              {formatDateSeparator(new Date(msg.created_at))}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {renderMessageBubble(msg, false)}
                    </React.Fragment>
                  )
                })
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
        
        {/* Preview de archivos seleccionados */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg group"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Barra de progreso */}
        {uploading && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.docx,.xlsx"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 h-11 w-11 min-w-[44px] min-h-[44px] touch-manipulation"
            onClick={() => fileInputRef.current?.click()}
            disabled={!conversationId || conversation?.status === 'closed' || uploading || conversation?.channel?.toLowerCase() === 'instagram'}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-11 w-11 min-w-[44px] min-h-[44px] touch-manipulation">
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
            placeholder={
              !conversationId 
                ? "Escribe un mensaje..." 
                : conversation?.status === 'closed' 
                  ? "Conversación cerrada" 
                  : conversation?.status === 'pending_response' 
                    ? "Esperando respuesta del usuario..." 
                    : "Escribe un mensaje..."
            }
            className="flex-1 min-h-[44px] max-h-[120px] resize-none text-[15px] touch-manipulation"
            disabled={!conversationId || conversation?.status === 'closed' || conversation?.status === 'pending_response'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e as any)
              }
            }}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '44px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
          {/* Debug logs en consola */}
          {/* COMENTADO: Causa loop infinito de re-renders
          {conversationId && (() => {
            console.log('🔍 ChatWindow Debug:', {
              conversationId,
              conversationStatus: conversation?.status,
              isDisabled: !conversationId || conversation?.status === 'closed' || conversation?.status === 'pending_response',
              conversation: conversation
            });
            return null;
          })()}
          */}
          <Button 
            type="submit" 
            size="icon" 
            className="h-11 w-11 min-w-[44px] min-h-[44px] touch-manipulation" 
            disabled={(!message.trim() && selectedFiles.length === 0) || !conversationId || conversation?.status === 'closed' || conversation?.status === 'pending_response' || uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
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
