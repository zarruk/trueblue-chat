
import { useState, useMemo } from 'react'
import { Search, Filter, MessageSquare, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react'
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
}

type ConversationStatus = 'active_ai' | 'active_human' | 'closed' | 'pending_human'

const statusConfig = {
  active_ai: { label: 'AI Activo', icon: Clock, variant: 'secondary' as const, color: 'text-blue-500 dark:text-blue-400' },
  active_human: { label: 'Humano Activo', icon: MessageSquare, variant: 'default' as const, color: 'text-green-500 dark:text-green-400' },
  pending_human: { label: 'Pendiente', icon: AlertCircle, variant: 'destructive' as const, color: 'text-orange-500 dark:text-orange-400' },
  closed: { label: 'Cerrado', icon: CheckCircle, variant: 'outline' as const, color: 'text-gray-500 dark:text-gray-400' }
}

export function ConversationList({ onSelectConversation, selectedConversationId, conversations, loading }: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')

  // Log para debugging de re-renderizado
  console.log('🔄 ConversationList: Re-renderizando con conversaciones:', conversations.length)
  console.log('🔍 ConversationList: Array de conversaciones completo:', conversations)
  if (selectedConversationId) {
    const selectedConv = conversations.find(c => c.id === selectedConversationId)
    console.log('🔍 ConversationList: Conversación seleccionada:', selectedConv)
  }

  // Obtener lista única de agentes asignados
  const assignedAgents = useMemo(() => {
    const agents = conversations
      .filter(conv => conv.assigned_agent_email && conv.assigned_agent_name)
      .map(conv => ({
        email: conv.assigned_agent_email!,
        name: conv.assigned_agent_name!
      }))
    
    // Eliminar duplicados
    const uniqueAgents = agents.filter((agent, index, self) => 
      index === self.findIndex(a => a.email === agent.email)
    )
    
    return uniqueAgents.sort((a, b) => a.name.localeCompare(b.name))
  }, [conversations])

  // Función para determinar si una conversación necesita respuesta urgente
  const needsUrgentResponse = (conversation: any) => {
    // Caso 1: Conversación en estado pending_human (esperando asignación)
    if (conversation.status === 'pending_human') {
      return true
    }
    
    // Caso 2: Conversación active_human pero el último mensaje es del usuario
    if (conversation.status === 'active_human' && conversation.last_message_sender_role === 'user') {
      return true
    }
    
    return false
  }

  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter(conversation => {
      const matchesSearch = 
        conversation.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || conversation.status === statusFilter
      const matchesAgent = agentFilter === 'all' || conversation.assigned_agent_email === agentFilter
      
      return matchesSearch && matchesStatus && matchesAgent
    })

    // Orden estricto: más recientes por último mensaje primero
    const sorted = filtered.sort((a, b) => {
      const aRef = a.last_message_at || a.updated_at
      const bRef = b.last_message_at || b.updated_at
      const aTime = new Date(aRef).getTime()
      const bTime = new Date(bRef).getTime()
      return bTime - aTime
    })
    
    console.log('🔄 ConversationList: Filtrando y ordenando conversaciones:', {
      total: conversations.length,
      filtered: filtered.length,
      urgentCount: sorted.filter(needsUrgentResponse).length
    })
    
    return sorted
  }, [conversations, searchTerm, statusFilter, agentFilter])

  const getStatusConfig = (status: ConversationStatus) => {
    return statusConfig[status] || statusConfig.pending_human
  }

  const getConversationPreview = (conversation: any) => {
    if (conversation.last_message_content) {
      return conversation.last_message_content
    }
    if (conversation.summary) {
      return conversation.summary
    }
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
    <div className="flex flex-col h-full bg-background border-r max-h-screen">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Conversaciones</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ConversationStatus | 'all')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active_ai">AI Activo</SelectItem>
              <SelectItem value="active_human">Humano Activo</SelectItem>
              <SelectItem value="pending_human">Pendiente</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agent Filter */}
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por agente" />
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

      {/* Conversation Count */}
      <div className="px-4 py-2 bg-muted/20">
        <p className="text-sm text-muted-foreground">
          {filteredConversations.length} conversación{filteredConversations.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto h-[60vh] max-h-[600px] min-h-[300px] scroll-smooth">
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
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => {
              const statusConfig = getStatusConfig(conversation.status)
              const isSelected = selectedConversationId === conversation.id
              const isUrgent = needsUrgentResponse(conversation)
              
              // Determinar el tipo de urgencia para estilos diferenciados
              const urgencyType = conversation.status === 'pending_human' 
                ? 'unassigned'  // Sin asignar - rojo intenso
                : conversation.status === 'active_human' && conversation.last_message_sender_role === 'user'
                ? 'awaiting_response'  // Esperando respuesta - naranja
                : 'none'
              
              // Log específico para debugging de cada tarjeta
              if (conversation.id === selectedConversationId) {
                console.log(`🎯 ConversationList: Renderizando tarjeta para conversación ${conversation.id}:`, {
                  status: conversation.status,
                  assigned_agent_id: conversation.assigned_agent_id,
                  assigned_agent_name: conversation.assigned_agent_name,
                  assigned_agent_email: conversation.assigned_agent_email,
                  updated_at: conversation.updated_at,
                  last_message_sender_role: conversation.last_message_sender_role,
                  isUrgent: isUrgent,
                  urgencyType: urgencyType,
                  urgentReason: isUrgent 
                    ? (conversation.status === 'pending_human' ? 'pending_human' : 'active_human_user_waiting')
                    : 'not_urgent',
                  statusConfig: statusConfig
                })
              }
              
              return (
                <div
                  key={conversation.id}
                  className={`
                    conversation-card relative p-3 rounded-lg cursor-pointer transition-all duration-200 border
                    ${isSelected 
                      ? 'selected bg-primary text-primary-foreground border-primary shadow-lg' 
                      : 'hover:bg-accent hover:border-accent-foreground/20 hover:shadow-md'
                    }
                    ${urgencyType === 'unassigned'
                      ? 'urgent-unassigned border-l-4 border-l-red-500 bg-red-50 dark:bg-gradient-to-r dark:from-red-950/20 dark:to-card hover:bg-red-100 dark:hover:from-red-950/30'
                      : urgencyType === 'awaiting_response'
                      ? 'urgent-awaiting border-l-4 border-l-orange-500 bg-orange-50 dark:bg-gradient-to-r dark:from-orange-950/20 dark:to-card hover:bg-orange-100 dark:hover:from-orange-950/30'
                      : ''
                    }
                  `}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelectConversation(conversation.id)
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>
                        {conversation.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <h4 className={`font-medium truncate ${
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          }`}>
                            {conversation.username || conversation.user_id}
                          </h4>
                          {/* Mostrar canal si existe */}
                          {conversation.channel && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1">
                              {conversation.channel}
                            </Badge>
                          )}
                          {isUrgent && (
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${
                                urgencyType === 'unassigned' 
                                  ? 'bg-red-500' 
                                  : 'bg-orange-500'
                              }`}></div>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                urgencyType === 'unassigned'
                                  ? 'text-red-600 bg-red-100'
                                  : 'text-orange-600 bg-orange-100'
                              }`}>
                                {urgencyType === 'unassigned' ? 'URGENTE' : 'RESPONDER'}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-xs ${
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {getTimeAgo(conversation.last_message_at || conversation.updated_at)}
                        </span>
                      </div>
                      
                      <p className={`text-sm truncate mb-2 ${
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {getConversationPreview(conversation)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={statusConfig.variant} 
                          className={`text-xs ${
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
                          <span className={`text-xs ${
                            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
          </div>
        )}
      </div>
    </div>
  )
}
