
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Paperclip, Smile, ChevronDown } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import { useAgents } from '@/hooks/useAgents'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
}

interface Message {
  id: string
  content: string
  sender_role: 'user' | 'ai' | 'agent'
  agent_email?: string
  agent_name?: string
  created_at: string
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

export function ChatWindow({ conversationId, messages: propMessages, loading: propLoading, onSendMessage, onSelectConversation, onUpdateConversationStatus, onAssignAgent, conversations: propConversations }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)

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
      name: msg.sender_role === 'user' ? 'Usuario' : 'AI',
      avatar: undefined,
      isCurrentUser: false
    }
  }

  const getMessageAlignment = (msg: Message) => {
    // Los mensajes de 'user' van a la izquierda, 'ai' y 'agent' van a la derecha
    return msg.sender_role === 'user' ? 'justify-start' : 'justify-end'
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
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
          
          {/* Status Selector */}
          <div className="flex items-center space-x-4">
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
            
            {/* Agent Assignment Selector */}
            <div className="flex flex-col items-end space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Asignar agente
              </label>
              <div className="flex items-center space-x-2">
                <Select 
                  onValueChange={handleAssignAgent} 
                  value={conversation?.assigned_agent_id || "none"}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="Seleccionar agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        👤 {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Última actividad
              </label>
              <span className={`text-sm font-medium ${getStatusColor(conversation?.status || 'closed')}`}>
                {conversation?.updated_at ? 
                  format(new Date(conversation.updated_at), 'dd/MM HH:mm', { locale: es }) : 
                  format(new Date(), 'dd/MM HH:mm', { locale: es })
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Botón para tomar conversación */}
        {conversation && conversation.status !== 'active_human' && conversation.status !== 'pending_human' && (
          <div className="p-2 border-b bg-muted/20">
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

        {/* Botón para regresar a IA */}
        {conversation && (conversation.status === 'active_human' || conversation.status === 'pending_human') && conversation.assigned_agent_id === profile?.id && (
          <div className="p-2 border-b bg-muted/20">
            <Button 
              onClick={async () => {
                if (!conversationId) return
                
                try {
                  console.log('🤖 ChatWindow: Botón "Regresar a IA" presionado para conversación:', conversationId)
                  console.log('🤖 ChatWindow: Estado actual de la conversación antes del cambio:', conversation)
                  
                  // Regresar la conversación a IA usando el flujo unificado
                  await handleStatusChange('active_ai')
                  
                  console.log('🤖 ChatWindow: Cambio a "active_ai" completado')
                  // Éxito gestionado por hooks superiores (evitar toasts duplicados)
                } catch (error) {
                  console.error('❌ ChatWindow: Error al regresar la conversación:', error)
                  toast.error('Error al regresar la conversación')
                }
              }}
              size="sm"
              variant="outline"
              className="w-full"
            >
              🤖 Regresar a IA
            </Button>
          </div>
        )}
        
        <div 
          ref={messagesContainerRef} 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 space-y-4 chat-messages-scroll"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : localMessages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
            </div>
          ) : (
            localMessages.map((msg) => {
              const senderInfo = getSenderInfo(msg)
              const alignment = getMessageAlignment(msg)
              
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
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_role === 'user'
                          ? 'text-muted-foreground'
                          : 'text-primary-foreground/70'
                      }`}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
            <Smile className="h-4 w-4" />
          </Button>
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
    </div>
  )
}
