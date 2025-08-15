
import React, { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useConversations } from '@/hooks/useConversations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ChatWindowProps {
  conversationId?: string
}

interface Message {
  id: string
  content: string
  sender_role: 'user' | 'ai' | 'agent'
  agent_email?: string
  agent_name?: string
  created_at: string
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const [message, setMessage] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()
  const { sendMessage, messages, loading } = useConversations()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !conversationId) return

    try {
      await sendMessage(conversationId, message, 'agent')
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
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
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">Conversación #{conversationId.slice(0, 8)}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Activa</Badge>
                <span className="text-sm text-muted-foreground">
                  Última actividad: {format(new Date(), 'HH:mm', { locale: es })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map((msg) => {
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
