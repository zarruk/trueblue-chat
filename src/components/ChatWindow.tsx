
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Paperclip, Smile, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useConversations } from '@/hooks/useConversations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ChatWindowProps {
  conversationId?: string
  messages?: any[]
  loading?: boolean
  onSendMessage?: (conversationId: string, content: string, role: string) => Promise<void>
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

export function ChatWindow({ conversationId, messages: propMessages, loading: propLoading, onSendMessage }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()
  const { 
    sendMessage: hookSendMessage, 
    messages: hookMessages, 
    loading: hookLoading, 
    fetchMessages,
    updateConversationStatus,
    conversations
  } = useConversations()

  // Use prop messages if provided, otherwise use hook messages
  const messages = propMessages || hookMessages
  const loading = propLoading !== undefined ? propLoading : hookLoading

  // Load messages when conversationId changes
  useEffect(() => {
    if (conversationId && fetchMessages) {
      console.log('🔄 ChatWindow: Loading messages for conversation:', conversationId)
      fetchMessages(conversationId)
    }
  }, [conversationId, fetchMessages])

  // Get conversation data when conversationId changes
  useEffect(() => {
    if (conversationId && conversations) {
      const currentConversation = conversations.find(conv => conv.id === conversationId)
      if (currentConversation) {
        console.log('🔄 ChatWindow: Actualizando conversación local:', currentConversation)
        setConversation(currentConversation)
      }
    }
  }, [conversationId, conversations])

  // Remove the complex comparison useEffect that was causing issues
  // The real-time updates will come directly from the conversations array

  // Update local messages when messages change
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages)
    }
  }, [messages])

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
      // Use prop onSendMessage if provided, otherwise use hook
      if (onSendMessage) {
        await onSendMessage(conversationId, message, 'agent')
      } else {
        await hookSendMessage(conversationId, message, 'agent')
      }
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!conversationId || !updateConversationStatus) return

    try {
      setUpdatingStatus(true)
      await updateConversationStatus(conversationId, newStatus as Conversation['status'])
      
      // No necesitamos actualizar el estado local aquí porque el hook ya lo hace
      // y se sincroniza automáticamente con el array de conversaciones
      console.log('✅ Status actualizado, sincronización automática en progreso...')
    } catch (error) {
      console.error('Error updating conversation status:', error)
    } finally {
      setUpdatingStatus(false)
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
    const senderInfo = getSenderInfo(msg)
    return senderInfo.isCurrentUser ? 'justify-end' : 'justify-start'
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
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="border-b px-6 py-4">
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
        {/* Botón temporal para testing del scroll */}
        <div className="p-2 border-b bg-muted/20">
          <Button 
            onClick={() => {
              const testMessage = {
                id: `test-${Date.now()}`,
                content: `Mensaje de prueba ${localMessages.length + 1} - ${new Date().toLocaleTimeString()}`,
                sender_role: 'user' as const,
                created_at: new Date().toISOString()
              }
              setLocalMessages(prev => [...prev, testMessage])
            }}
            size="sm"
            variant="outline"
          >
            Agregar mensaje de prueba
          </Button>
        </div>
        
        <div 
          ref={messagesContainerRef} 
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 chat-messages-scroll"
          style={{ 
            height: '400px',
            maxHeight: '400px',
            minHeight: '400px'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : localMessages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
              <p className="text-xs mt-2">Usa el botón de arriba para agregar mensajes de prueba</p>
            </div>
          ) : (
            localMessages.map((msg) => {
              const senderInfo = getSenderInfo(msg)
              const alignment = getMessageAlignment(msg)
              
              return (
                <div key={msg.id} className={`flex ${alignment}`}>
                  <div className={`flex items-start space-x-3 max-w-[70%] ${alignment === 'justify-end' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!senderInfo.isCurrentUser && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={senderInfo.avatar} />
                        <AvatarFallback>
                          {senderInfo.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`rounded-lg px-4 py-2 ${
                      senderInfo.isCurrentUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        senderInfo.isCurrentUser 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
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
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
            disabled={!conversationId}
          />
          <Button type="submit" size="icon" disabled={!message.trim() || !conversationId}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
