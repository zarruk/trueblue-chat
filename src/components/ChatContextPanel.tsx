import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Conversation } from '@/hooks/useConversations'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ChatContextPanelProps {
  conversation: Conversation | null
  onToggleVisibility?: () => void
}

export function ChatContextPanel({ conversation, onToggleVisibility }: ChatContextPanelProps) {
  const [open, setOpen] = useState(true)
  if (!conversation) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Contexto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Selecciona una conversación para ver el contexto.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contacto</CardTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              aria-expanded={open}
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {open ? 'Ocultar' : 'Mostrar'}
            </button>
            {onToggleVisibility && (
              <button
                type="button"
                onClick={onToggleVisibility}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border"
                title="Ocultar panel completo"
              >
                ✕
              </button>
            )}
          </div>
        </CardHeader>
        {open && (
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {conversation.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {conversation.username || conversation.user_id}
              </div>
              <div className="text-xs text-muted-foreground">
                {conversation.phone_number || '—'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {conversation.channel && (
              <Badge variant="outline">{conversation.channel}</Badge>
            )}
            <Badge variant={conversation.status === 'closed' ? 'destructive' : 'secondary'}>
              {conversation.status === 'active_ai' && 'IA Activa'}
              {conversation.status === 'active_human' && 'Humano Activo'}
              {conversation.status === 'pending_human' && 'Pendiente Humano'}
              {conversation.status === 'closed' && 'Cerrada'}
            </Badge>
          </div>
          {conversation.assigned_agent_name && (
            <div className="text-sm">
              Asignado a: <span className="font-medium">{conversation.assigned_agent_name}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Creada: {format(new Date(conversation.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
          </div>
          <div className="text-xs text-muted-foreground">
            Actualizada: {format(new Date(conversation.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
          </div>
        </CardContent>
        )}
      </Card>

      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notas internas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Próximamente: notas, etiquetas y propiedades.</p>
        </CardContent>
      </Card>
    </div>
  )
}


