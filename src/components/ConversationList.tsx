
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Search, Filter, MessageSquare, Clock, CheckCircle, AlertCircle, Users, MessageCircle, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Conversation } from '@/hooks/useConversations'

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
  conversations: Conversation[]
  loading: boolean
  // Props de scroll infinito y búsqueda
  loadMore?: () => void
  loadingMore?: boolean
  hasMore?: boolean
  onSearch?: (query: string) => void
  isSearching?: boolean
  searchQuery?: string
  // Props de paginación (legacy - para mantener compatibilidad)
  currentPage?: number
  totalCount?: number
}

type ConversationStatus = 'active_ai' | 'active_human' | 'closed' | 'pending_human' | 'pending_response'

const statusConfig = {
  active_ai: { label: 'AI Activo', icon: Clock, variant: 'secondary' as const, color: 'text-blue-500 dark:text-blue-400' },
  active_human: { label: 'Humano Activo', icon: MessageSquare, variant: 'default' as const, color: 'text-green-500 dark:text-green-400' },
  pending_human: { label: 'Pendiente', icon: AlertCircle, variant: 'destructive' as const, color: 'text-orange-500 dark:text-orange-400' },
  pending_response: { label: 'Esperando Respuesta', icon: Clock, variant: 'outline' as const, color: 'text-yellow-500 dark:text-yellow-400' },
  closed: { label: 'Cerrado', icon: CheckCircle, variant: 'outline' as const, color: 'text-gray-500 dark:text-gray-400' }
}

// Estilos por canal (normalizados en minúscula)
const getChannelConfig = (channel?: string) => {
  const key = (channel || '').toLowerCase()
  if (key.includes('whatsapp')) {
    return {
      label: 'WhatsApp',
      icon: MessageCircle,
      className: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
    }
  }
  if (key.includes('telegram')) {
    return {
      label: 'Telegram',
      icon: Send,
      className: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white',
    }
  }
  return {
    label: channel || 'Canal',
    icon: MessageSquare,
    className: 'bg-muted text-foreground',
  }
}

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

export function ConversationList({ 
  onSelectConversation, 
  selectedConversationId, 
  conversations, 
  loading,
  loadMore,
  loadingMore = false,
  hasMore = false,
  onSearch,
  isSearching = false,
  searchQuery = '',
  currentPage = 1,
  totalCount = 0
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all' | 'abierta'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  
  // Refs para el scroll infinito
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  // Log para debugging de re-renderizado
  console.log('🔄 ConversationList: Re-renderizando con conversaciones:', conversations.length)
  console.log('🔍 ConversationList: Array de conversaciones completo:', conversations)
  if (selectedConversationId) {
    const selectedConv = conversations.find(c => c.id === selectedConversationId)
    console.log('🔍 ConversationList: Conversación seleccionada:', selectedConv)
  }
  
  // Debounce para búsqueda
  useEffect(() => {
    if (!onSearch) return
    
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm)
    }, 300) // 300ms de debounce
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, onSearch])
  
  // Implementar IntersectionObserver para scroll infinito
  useEffect(() => {
    if (!loadMore || isSearching) return // No scroll infinito en modo búsqueda
    
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (firstEntry.isIntersecting && hasMore && !loadingMore) {
          console.log('📜 Scroll infinito: Cargando más conversaciones...')
          loadMore()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px', // Cargar cuando falten 100px para el final
        threshold: 0.1
      }
    )

    const currentTrigger = loadMoreTriggerRef.current
    if (currentTrigger) {
      observer.observe(currentTrigger)
    }

    return () => {
      if (currentTrigger) {
        observer.unobserve(currentTrigger)
      }
    }
  }, [loadMore, hasMore, loadingMore, isSearching])

  // Obtener lista única de agentes asignados
  const assignedAgents = useMemo(() => {
    const agents = conversations
      .filter(conv => conv.assigned_agent_email && conv.assigned_agent_name)
      .map(conv => ({
        email: conv.assigned_agent_email!,
        name: conv.assigned_agent_name!
      }))
    const uniqueAgents = agents.filter((agent, index, self) => index === self.findIndex(a => a.email === agent.email))
    return uniqueAgents.sort((a, b) => a.name.localeCompare(b.name))
  }, [conversations])

  // Función para determinar si una conversación necesita respuesta urgente
  const needsUrgentResponse = (conversation: any) => {
    if (conversation.status === 'pending_human') return true
    if (conversation.status === 'active_human' && conversation.last_message_sender_role === 'user') return true
    if (conversation.status === 'pending_response') return true
    return false
  }

  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter(conversation => {
      const matchesSearch =
        conversation.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'abierta'
            ? conversation.status !== 'closed'
            : conversation.status === statusFilter

      const matchesAgent = agentFilter === 'all' || conversation.assigned_agent_email === agentFilter
      return matchesSearch && matchesStatus && matchesAgent
    })

    // Ya no necesitamos ordenar aquí porque las conversaciones vienen ordenadas desde la BD
    // Mantener el orden original que viene del backend
    return filtered
  }, [conversations, searchTerm, statusFilter, agentFilter])

  const getStatusConfigLocal = (status: ConversationStatus) => {
    return statusConfig[status] || statusConfig.pending_human
  }

  const getConversationPreview = (conversation: any) => {
    if (conversation.last_message_content) return conversation.last_message_content
    if (conversation.summary) return conversation.summary
    return 'Sin mensajes'
  }

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      if (diffInMinutes < 1) return 'Ahora'
      if (diffInMinutes < 60) return `${diffInMinutes}m`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
      return `${Math.floor(diffInMinutes / 1440)}d`
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background border-r dark:border-slate-700 max-h-screen">
      {/* Header compacto */}
      <div className="p-1 border-b dark:border-slate-700">
        <div className="flex items-center gap-1 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6 h-7 text-xs w-[200px]"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ConversationStatus | 'all')}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active_ai">AI Activo</SelectItem>
              <SelectItem value="active_human">Humano Activo</SelectItem>
              <SelectItem value="pending_human">Pendiente</SelectItem>
              <SelectItem value="pending_response">Pendiente Respuesta</SelectItem>
              <SelectItem value="abierta">Abierta</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los agentes</SelectItem>
              {assignedAgents.map((agent) => (
                <SelectItem key={agent.email} value={agent.email}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Conversations List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto h-[60vh] max-h-[600px] min-h-[300px] scroll-smooth">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || agentFilter !== 'all'
                ? 'No se encontraron conversaciones con los filtros aplicados'
                : 'No hay conversaciones aún'
              }
            </p>
            {(searchTerm || statusFilter !== 'all' || agentFilter !== 'all') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setAgentFilter('all')
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {filteredConversations.map((conversation) => {
              const statusConfig = getStatusConfigLocal(conversation.status)
              const isSelected = selectedConversationId === conversation.id
              const isUrgent = needsUrgentResponse(conversation)
              const urgencyType = conversation.status === 'pending_human' 
                ? 'unassigned'
                : conversation.status === 'active_human' && conversation.last_message_sender_role === 'user'
                ? 'awaiting_response'
                : conversation.status === 'pending_response'
                ? 'pending_response'
                : 'none'

              const ch = getChannelConfig(conversation.channel)
              const ChannelIcon = ch.icon

              return (
                <div
                  key={conversation.id}
                  className={`
                    conversation-card relative p-2 rounded-lg cursor-pointer transition-all duration-200 border dark:border-slate-700 overflow-hidden
                    ${isSelected 
                      ? 'selected text-primary-foreground border-transparent shadow-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-indigo-500 dark:via-violet-500 dark:to-fuchsia-500' 
                      : 'hover:bg-accent/60 dark:hover:bg-slate-800/60 hover:border-accent-foreground/20 hover:shadow-md'
                    }
                    ${urgencyType === 'unassigned'
                      ? 'urgent-unassigned border-l-4 border-l-red-500 bg-red-50 dark:border-l-red-400 dark:bg-red-950/40'
                      : urgencyType === 'awaiting_response'
                      ? 'urgent-awaiting border-l-4 border-l-orange-500 bg-orange-50 dark:border-l-orange-400 dark:bg-orange-950/40'
                      : urgencyType === 'pending_response'
                      ? 'urgent-pending-response border-l-4 border-l-yellow-500 bg-yellow-50 dark:border-l-yellow-400 dark:bg-yellow-950/40'
                      : ''
                    }
                  `}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelectConversation(conversation.id)
                  }}
                >
                  <div className="flex items-start space-x-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>
                        {conversation.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <h4 className={`font-medium truncate text-sm ${
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          }`}>
                            {conversation.username || conversation.user_id}
                          </h4>
                          {conversation.channel && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm ring-1 ${
                              isSelected ? 'bg-white/15 text:white ring-white/30' : `${ch.className} ring-black/0`
                            }`}>
                              <ChannelIcon className="h-3 w-3" />
                              {ch.label}
                            </span>
                          )}
                          {isUrgent && (
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${
                                urgencyType === 'unassigned' ? 'bg-red-500' : 
                                urgencyType === 'awaiting_response' ? 'bg-orange-500' : 
                                'bg-yellow-500'
                              }`}></div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                urgencyType === 'unassigned' ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40' : 
                                urgencyType === 'awaiting_response' ? 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40' : 
                                'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40'
                              }`}>
                                {urgencyType === 'unassigned' ? 'URGENTE' : 
                                 urgencyType === 'awaiting_response' ? 'RESPONDER' : 
                                 'ESPERANDO'}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {getTimeAgo(conversation.last_message_at || conversation.updated_at)}
                        </span>
                      </div>
                      
                      <p className={`text-xs truncate mb-1 ${
                        isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      }`}>
                        {getConversationPreview(conversation)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={statusConfig.variant}
                          className={`text-[10px] ${
                            conversation.status === 'active_ai' ? 'badge-ai-active' :
                            conversation.status === 'active_human' ? 'badge-human-active' :
                            conversation.status === 'pending_human' ? 'badge-pending' :
                            'badge-closed'
                          }`}
                        >
                          <statusConfig.icon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        
                        {conversation.assigned_agent_name && (
                          <span className={`text-[10px] ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}>
                            {conversation.assigned_agent_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Trigger para cargar más conversaciones */}
            {!isSearching && hasMore && (
              <div ref={loadMoreTriggerRef} className="p-4 text-center">
                {loadingMore ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Cargando más conversaciones...</span>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {/* Mensaje sutil para indicar que se puede hacer scroll */}
                    <div className="w-full h-1" />
                  </div>
                )}
              </div>
            )}
            
            {/* Indicador cuando se han cargado todas */}
            {!isSearching && !hasMore && conversations.length > 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Has llegado al final • {totalCount} conversaciones en total
              </div>
            )}
            
            {/* Indicador para búsqueda */}
            {isSearching && conversations.length > 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Mostrando {conversations.length} resultados de búsqueda
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
