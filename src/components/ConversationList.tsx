
import { useState, useMemo } from 'react'
import { Search, Filter, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConversations } from '@/hooks/useConversations'


interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
}

type ConversationStatus = 'active_ai' | 'active_human' | 'closed' | 'pending_human'

const statusConfig = {
  active_ai: { label: 'AI Activo', icon: Clock, variant: 'secondary' as const, color: 'text-blue-600' },
  active_human: { label: 'Humano Activo', icon: MessageSquare, variant: 'default' as const, color: 'text-green-600' },
  pending_human: { label: 'Pendiente', icon: AlertCircle, variant: 'destructive' as const, color: 'text-orange-600' },
  closed: { label: 'Cerrado', icon: CheckCircle, variant: 'outline' as const, color: 'text-gray-600' }
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all')
  const { conversations, loading } = useConversations()

  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      const matchesSearch = 
        conversation.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || conversation.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [conversations, searchTerm, statusFilter])

  const getStatusConfig = (status: ConversationStatus) => {
    return statusConfig[status] || statusConfig.pending_human
  }

  const getConversationPreview = (conversation: any) => {
    if (conversation.summary) {
      return conversation.summary
    }
    return conversation.username || conversation.user_id || 'Sin nombre'
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
    <div className="flex flex-col h-full bg-background border-r">
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
        <div className="flex items-center space-x-2">
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
      </div>

      {/* Conversation Count */}
      <div className="px-4 py-2 bg-muted/20">
        <p className="text-sm text-muted-foreground">
          {filteredConversations.length} conversación{filteredConversations.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron conversaciones con los filtros aplicados'
                : 'No hay conversaciones aún'
              }
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
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
              
              return (
                <div
                  key={conversation.id}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors border
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'hover:bg-accent hover:border-accent-foreground/20'
                    }
                  `}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>
                        {conversation.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium truncate ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                          {conversation.username || conversation.user_id}
                        </h4>
                        <span className={`text-xs ${
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {getTimeAgo(conversation.updated_at)}
                        </span>
                      </div>
                      
                      <p className={`text-sm truncate mb-2 ${
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {getConversationPreview(conversation)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant={statusConfig.variant} className="text-xs">
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
