import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, MessageSquare, Clock, RefreshCcw, Kanban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ConversationRow {
  id: string
  user_id: string
  username?: string | null
  updated_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_role: 'user' | 'ai' | 'agent'
  created_at: string
  agent_email?: string | null
}

interface UserAggregate {
  userId: string
  displayName: string
  lastActivity: string
  aiCount: number
  agentCount: number
  conversationIds: Set<string>
}

const PAGE_SIZE = 300

export default function Embudo() {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [userAgg, setUserAgg] = useState<Map<string, UserAggregate>>(new Map())
  const navigate = useNavigate()

  const leads = useMemo(() => bucket(userAgg, 'leads'), [userAgg])
  const firstContact = useMemo(() => bucket(userAgg, 'first'), [userAgg])
  const discussion = useMemo(() => bucket(userAgg, 'discussion'), [userAgg])
  const recurring = useMemo(() => bucket(userAgg, 'recurring'), [userAgg])

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true)
    try {
      // 1) Obtener conversaciones más recientes paginadas
      const { data: convs, error: convErr } = await supabase
        .from('tb_conversations')
        .select('id,user_id,username,updated_at')
        .order('updated_at', { ascending: false })
        .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1)

      if (convErr) {
        console.error('❌ Embudo: error obteniendo conversaciones', convErr)
        setLoading(false)
        return
      }

      if (!convs || convs.length === 0) {
        setHasMore(false)
        setLoading(false)
        return
      }

      const convRows = convs as unknown as ConversationRow[]
      const convIds = convRows.map(c => c.id)
      const convToUser = new Map<string, ConversationRow>()
      convRows.forEach(c => convToUser.set(c.id, c))

      // 2) Obtener mensajes de esas conversaciones
      const { data: msgs, error: msgErr } = await supabase
        .from('tb_messages')
        .select('id,conversation_id,sender_role,created_at,agent_email')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })

      if (msgErr) {
        console.error('❌ Embudo: error obteniendo mensajes', msgErr)
        setLoading(false)
        return
      }

      const updated = new Map(userAgg)

      // Seed agregados por usuario con últimas fechas de conversación
      for (const c of convRows) {
        const key = c.user_id
        const prev = updated.get(key)
        const displayName = c.username || c.user_id
        if (!prev) {
          updated.set(key, {
            userId: key,
            displayName,
            lastActivity: c.updated_at,
            aiCount: 0,
            agentCount: 0,
            conversationIds: new Set([c.id])
          })
        } else {
          prev.displayName = prev.displayName || displayName
          prev.lastActivity = new Date(prev.lastActivity) > new Date(c.updated_at) ? prev.lastActivity : c.updated_at
          prev.conversationIds.add(c.id)
        }
      }

      // Acumular mensajes por usuario
      for (const m of (msgs as unknown as MessageRow[])) {
        const conv = convToUser.get(m.conversation_id)
        if (!conv) continue
        const agg = updated.get(conv.user_id)
        if (!agg) continue
        if (m.sender_role === 'ai') agg.aiCount += 1
        if (m.sender_role === 'agent') agg.agentCount += 1
        // actualizar última actividad
        if (new Date(m.created_at) > new Date(agg.lastActivity)) agg.lastActivity = m.created_at
      }

      setUserAgg(updated)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }, [userAgg])

  // Carga inicial
  useEffect(() => {
    loadPage(0)
  }, [loadPage])

  // Realtime: actualizar agregados al llegar mensajes nuevos
  useEffect(() => {
    const channel = supabase
      .channel('embudo-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tb_messages' }, async (payload) => {
        const m = payload.new as unknown as MessageRow
        // Buscar conversación para mapear a usuario
        const { data: conv, error } = await supabase
          .from('tb_conversations')
          .select('id,user_id,username,updated_at')
          .eq('id', m.conversation_id)
          .maybeSingle()
        if (error || !conv) return
        setUserAgg(prev => {
          const updated = new Map(prev)
          const key = conv.user_id as string
          const displayName = (conv as any).username || key
          const current = updated.get(key) || {
            userId: key,
            displayName,
            lastActivity: (conv as any).updated_at as string,
            aiCount: 0,
            agentCount: 0,
            conversationIds: new Set<string>()
          }
          current.displayName = current.displayName || displayName
          current.lastActivity = new Date(current.lastActivity) > new Date(m.created_at) ? current.lastActivity : m.created_at
          current.conversationIds.add(m.conversation_id)
          if (m.sender_role === 'ai') current.aiCount += 1
          if (m.sender_role === 'agent') current.agentCount += 1
          updated.set(key, current)
          return updated
        })
      })
    channel.subscribe()
    return () => { channel.unsubscribe() }
  }, [])

  const handleOpenUser = useCallback(async (userId: string) => {
    try {
      const { data: conv, error } = await supabase
        .from('tb_conversations')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        console.warn('⚠️ Embudo: error obteniendo última conversación del usuario', error)
      }
      if (conv?.id) {
        navigate(`/dashboard?conv=${conv.id}`)
      } else {
        navigate('/dashboard')
      }
    } catch (e) {
      console.warn('⚠️ Embudo: excepción al navegar a conversación', e)
      navigate('/dashboard')
    }
  }, [navigate])

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kanban className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Embudo</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualizando…' : 'Al día'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-h-0 flex-1">
        <Column title="Leads" description="IA x1, 0 humano" items={leads} loading={loading} onOpen={handleOpenUser} />
        <Column title="Primer contacto" description=">=2 IA, 0 humano" items={firstContact} loading={loading} onOpen={handleOpenUser} />
        <Column title="Discusión" description=">=1 humano" items={discussion} loading={loading} onOpen={handleOpenUser} />
        <Column title="Recurrentes" description=">1 conversación" items={recurring} loading={loading} onOpen={handleOpenUser} />
      </div>

      <div className="flex justify-center py-2">
        {hasMore && (
          <button
            className="text-xs px-3 py-1 rounded border hover:bg-accent"
            onClick={() => loadPage(page + 1)}
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        )}
      </div>
    </div>
  )
}

function bucket(map: Map<string, UserAggregate>, type: 'leads'|'first'|'discussion'|'recurring') {
  const arr: UserAggregate[] = []
  map.forEach(v => {
    const convs = v.conversationIds.size
    const isLead = v.aiCount <= 1 && v.agentCount === 0
    const isFirst = v.aiCount >= 2 && v.agentCount === 0
    const isRecurring = convs > 1
    const isDiscussion = v.agentCount >= 1

    if (type === 'leads' && isLead) arr.push(v)
    if (type === 'first' && isFirst) arr.push(v)
    if (type === 'recurring' && isRecurring) arr.push(v)
    if (type === 'discussion' && isDiscussion && !isRecurring) arr.push(v)
  })
  // Orden por última actividad desc
  arr.sort((a,b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  return arr
}

function Column({ title, description, items, loading, onOpen }: { title: string; description: string; items: UserAggregate[]; loading: boolean; onOpen: (userId: string) => void }) {
  return (
    <Card className="flex flex-col min-h-0">
      <CardHeader className="py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-[52vh] px-2">
          {loading && items.length === 0 ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_,i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3">Vacío</div>
          ) : (
            <div className="space-y-2 py-2">
              {items.map(it => (
                <div key={it.userId} className="border rounded-md p-2 text-xs flex items-center justify-between cursor-pointer hover:bg-accent/50"
                  onClick={() => onOpen(it.userId)}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">Última: {new Date(it.lastActivity).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600"><MessageSquare className="h-3 w-3" />IA {it.aiCount}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-600"><Users className="h-3 w-3" />H {it.agentCount}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{it.conversationIds.size}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
