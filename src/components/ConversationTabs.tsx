
import { ConversationList } from './ConversationList'
import { Conversation } from '@/hooks/useConversations'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useClient } from '@/hooks/useClient'

interface ConversationTabsProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
  conversations: Conversation[]
  loading: boolean
  // Nuevos: acciones elevadas desde Dashboard para evitar instancias duplicadas del hook
  fetchConversations?: (options?: { background?: boolean }) => Promise<void>
  selectById?: (conversationId: string) => void
  // Props de scroll infinito y búsqueda
  loadMore?: () => void
  loadingMore?: boolean
  hasMore?: boolean
  searchConversations?: (query: string) => void
  isSearching?: boolean
  searchQuery?: string
  // Props de paginación (legacy)
  currentPage?: number
  totalCount?: number
  // Props para control inteligente de scroll
  onScrollStateChange?: (isScrolling: boolean) => void
  isUserScrolling?: boolean
  newConversationIds?: Set<string>
}

export function ConversationTabs({ 
  onSelectConversation, 
  selectedConversationId, 
  conversations, 
  loading, 
  fetchConversations, 
  selectById,
  loadMore,
  loadingMore,
  hasMore,
  searchConversations,
  isSearching,
  searchQuery,
  currentPage = 1,
  totalCount = 0,
  onScrollStateChange,
  isUserScrolling = false,
  newConversationIds = new Set()
}: ConversationTabsProps) {
  const { profile } = useAuth()
  const { getClientDisplayName } = useClient()
  const [open, setOpen] = useState(false)
  const [country, setCountry] = useState<string>('CO')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  const countries = useMemo(() => ([
    { code: 'CO', name: 'Colombia', dial: '+57' },
    { code: 'MX', name: 'México', dial: '+52' },
    { code: 'AR', name: 'Argentina', dial: '+54' },
    { code: 'US', name: 'Estados Unidos', dial: '+1' },
    { code: 'ES', name: 'España', dial: '+34' },
  ]), [])

  const selected = useMemo(() => countries.find(c => c.code === country) || countries[0], [countries, country])
  const fullPhone = useMemo(() => `${selected.dial}${phone.replace(/[^0-9]/g,'')}`, [selected.dial, phone])
  const preview = useMemo(() => {
    const clientName = getClientDisplayName()
    return `Hola, ${name || '{{name}}'}.

Te contactamos de ${clientName} porque ${reason || '{{razon}}'}.

Quedamos súper pendientes.`
  }, [name, reason, getClientDisplayName])

  const sendOutbound = async () => {
    if (!(profile as any)?.id) return
    // Usar función serverless que reenvía a la URL de entorno adecuada
    const url = '/api/n8n-outbound'
    const payload = {
      to: {
        countryCode: selected.code,
        dialCode: selected.dial,
        phone: phone.replace(/[^0-9]/g,'') || undefined,
        fullPhone,
        name,
      },
      reason,
      message: preview,
      channel: 'whatsapp',
      requestedBy: {
        id: (profile as any).id,
        email: (profile as any).email,
        name: (profile as any).name,
        client_id: (profile as any).client_id, // Agregar client_id del agente
      },
      conversationSeed: {
        user_id: fullPhone,
        username: name || undefined,
        status: 'pending_response', // Cambiar a pending_response para outbound
        assigned_agent_id: (profile as any).id,
        assigned_agent_email: (profile as any).email,
        assigned_agent_name: (profile as any).name,
        client_id: (profile as any).client_id, // Agregar client_id para la conversación
      },
      metadata: {
        source: 'dashboard_outbound',
        appEnv: (import.meta as any).env?.VITE_APP_ENV || 'development',
        appUrl: (import.meta as any).env?.VITE_APP_URL || (window as any).location?.origin,
        client_id: (profile as any).client_id, // Agregar client_id en metadata
      }
    }
    try {
      setSending(true)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        let createdId: string | undefined
        try {
          const body = await res.json()
          createdId = body?.conversationId || body?.conversation_id
        } catch (e) {
          console.warn('⚠️ No se pudo parsear respuesta del webhook:', e)
        }
        setOpen(false)
        setPhone(''); setName(''); setReason('')
        // Refrescar lista para ver la conversación al instante
        if (fetchConversations) await fetchConversations({ background: true })
        // Seleccionar si tenemos id
        if (createdId && selectById) {
          selectById(createdId)
        }
      } else {
        const txt = await res.text()
        console.error('❌ Error enviando webhook outbound:', res.status, txt)
      }
    } catch (e) {
      console.error('❌ Excepción enviando webhook outbound:', e)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Conversaciones</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="inline-flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ConversationList
          onSelectConversation={onSelectConversation}
          selectedConversationId={selectedConversationId}
          conversations={conversations}
          loading={loading}
          // Props de scroll infinito y búsqueda
          loadMore={loadMore}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onSearch={searchConversations}
          isSearching={isSearching}
          searchQuery={searchQuery}
          // Props de paginación (legacy)
          currentPage={currentPage}
          totalCount={totalCount}
          // Props para control inteligente de scroll
          onScrollStateChange={onScrollStateChange}
          isUserScrolling={isUserScrolling}
          newConversationIds={newConversationIds}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Iniciar conversación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-xs text-muted-foreground">País</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name} ({c.dial})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <div className="flex items-center gap-2">
                  <div className="px-2 h-8 rounded border text-sm flex items-center bg-muted/50">{selected.dial}</div>
                  <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="3001234567" className="h-8" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nombre</label>
              <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del destinatario" className="h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Razón</label>
              <Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo del contacto" className="h-8" />
            </div>
            <div className="rounded border p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">Vista previa</div>
              <pre className="whitespace-pre-wrap text-sm">{preview}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={sending || !phone} onClick={sendOutbound}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
