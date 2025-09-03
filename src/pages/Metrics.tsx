import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Clock, CheckCircle, AlertCircle, Activity, Timer } from 'lucide-react'
import { useConversations } from '@/hooks/useConversations'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export default function Metrics() {
  const { conversations } = useConversations()

  const now = Date.now()
  const minutes = (n: number) => n * 60 * 1000
  const inLast = (iso: string | undefined, ms: number) => (iso ? now - new Date(iso).getTime() <= ms : false)

  const pendingHuman = conversations.filter(c => c.status === 'pending_human')
  const awaitingResponse = conversations.filter(c => c.status === 'active_human' && c.last_message_sender_role === 'user')
  const activeAI = conversations.filter(c => c.status === 'active_ai')

  const new24h = conversations.filter(c => inLast(c.created_at, minutes(60 * 24)))
  const closed24h = conversations.filter(c => c.status === 'closed' && inLast(c.updated_at, minutes(60 * 24)))

  const pendingOver10m = pendingHuman.filter(c => !c.updated_at || (now - new Date(c.updated_at).getTime()) > minutes(10))
  const awaitingOver5m = awaitingResponse.filter(c => c.last_message_at && (now - new Date(c.last_message_at).getTime()) > minutes(5))

  const loadByAgent = conversations.reduce<Record<string, number>>((acc, c) => {
    if (c.status === 'active_human' && c.assigned_agent_email) {
      acc[c.assigned_agent_email] = (acc[c.assigned_agent_email] || 0) + 1
    }
    return acc
  }, {})
  const loadByAgentSorted = Object.entries(loadByAgent).sort((a, b) => b[1] - a[1])

  // Tiempos de respuesta promedio (últimos 7 días)
  type SimpleMsg = { conversation_id: string; sender_role: 'user'|'ai'|'agent'; agent_email?: string|null; created_at: string }
  const [avgResponseMinutes, setAvgResponseMinutes] = useState<number | null>(null)
  const [perAgentAvgMinutes, setPerAgentAvgMinutes] = useState<Record<string, number>>({})
  const [perAgentCounts, setPerAgentCounts] = useState<Record<string, number>>({})
  const [respSamples, setRespSamples] = useState<number>(0)
  const [loadingResp, setLoadingResp] = useState<boolean>(false)

  useEffect(() => {
    const loadResponseTimes = async () => {
      try {
        setLoadingResp(true)
        const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        // Obtener conversaciones de últimos 7 días
        const { data: convs, error: convErr } = await supabase
          .from('tb_conversations')
          .select('id')
          .gte('created_at', sinceIso)
          .limit(1000)
        if (convErr) {
          console.error('❌ Metrics: error fetching conversations for response times', convErr)
          setLoadingResp(false)
          return
        }
        const ids = (convs || []).map(c => c.id)
        if (ids.length === 0) {
          setAvgResponseMinutes(0)
          setPerAgentAvgMinutes({})
          setPerAgentCounts({})
          setRespSamples(0)
          setLoadingResp(false)
          return
        }
        // Obtener mensajes de esas conversaciones
        const { data: msgs, error: msgErr } = await supabase
          .from('tb_messages')
          .select('conversation_id, sender_role, agent_email, created_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: true })
          .limit(50000)
        if (msgErr) {
          console.error('❌ Metrics: error fetching messages', msgErr)
          setLoadingResp(false)
          return
        }
        const byConv = new Map<string, SimpleMsg[]>()
        for (const m of (msgs || []) as any as SimpleMsg[]) {
          if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, [])
          byConv.get(m.conversation_id)!.push(m)
        }
        let totalDeltaMin = 0
        let totalPairs = 0
        const agentTotal: Record<string, number> = {}
        const agentPairs: Record<string, number> = {}

        // Para cada conversación, emparejar cada mensaje de usuario con la siguiente respuesta (ai o agent)
        for (const [, arr] of byConv.entries()) {
          let pendingUserTime: number | null = null
          for (const m of arr) {
            if (m.sender_role === 'user') {
              pendingUserTime = new Date(m.created_at).getTime()
            } else if (pendingUserTime != null) {
              const deltaMin = (new Date(m.created_at).getTime() - pendingUserTime) / 60000
              if (deltaMin >= 0 && deltaMin < 24 * 60) { // descartar outliers >24h
                totalDeltaMin += deltaMin
                totalPairs += 1
                if (m.sender_role === 'agent' && m.agent_email) {
                  agentTotal[m.agent_email] = (agentTotal[m.agent_email] || 0) + deltaMin
                  agentPairs[m.agent_email] = (agentPairs[m.agent_email] || 0) + 1
                }
              }
              pendingUserTime = null
            }
          }
        }
        setRespSamples(totalPairs)
        setAvgResponseMinutes(totalPairs > 0 ? totalDeltaMin / totalPairs : 0)
        const perAgent: Record<string, number> = {}
        for (const email of Object.keys(agentTotal)) {
          const c = agentPairs[email] || 0
          perAgent[email] = c > 0 ? agentTotal[email] / c : 0
        }
        setPerAgentAvgMinutes(perAgent)
        setPerAgentCounts(agentPairs)
      } catch (e) {
        console.error('❌ Metrics: exception computing response times', e)
      } finally {
        setLoadingResp(false)
      }
    }
    loadResponseTimes()
  }, [])

  const perAgentSorted = useMemo(() => Object.entries(perAgentAvgMinutes).sort((a,b)=>a[1]-b[1]), [perAgentAvgMinutes])

  return (
    <div className="h-full flex flex-col gap-3 p-4 md:p-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Métricas</h2>
          <p className="text-sm text-muted-foreground">Visión operativa y SLA en tiempo real</p>
        </div>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1">
            <CardTitle className="text-[11px] font-medium">Pendiente</CardTitle>
            <AlertCircle className="h-3 w-3 text-orange-500" />
          </CardHeader>
          <CardContent className="py-1"><div className="text-xl font-bold">{pendingHuman.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1">
            <CardTitle className="text-[11px] font-medium">Esperando resp.</CardTitle>
            <Clock className="h-3 w-3 text-red-500" />
          </CardHeader>
          <CardContent className="py-1"><div className="text-xl font-bold text-red-600">{awaitingResponse.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1">
            <CardTitle className="text-[11px] font-medium">IA activa</CardTitle>
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1"><div className="text-xl font-bold">{activeAI.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1">
            <CardTitle className="text-[11px] font-medium">Nuevas (24h)</CardTitle>
            <Users className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1"><div className="text-xl font-bold">{new24h.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1">
            <CardTitle className="text-[11px] font-medium">Cerradas (24h)</CardTitle>
            <CheckCircle className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1"><div className="text-xl font-bold">{closed24h.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1">
            <CardTitle className="text-[11px] font-medium">Resp. prom. (7d)</CardTitle>
            <Timer className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1"><div className="text-xl font-bold">{loadingResp || avgResponseMinutes==null ? '—' : `${avgResponseMinutes.toFixed(1)}m`}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-0.5">
            <CardTitle className="text-[11px] font-medium">SLA alertas</CardTitle>
            <AlertCircle className="h-3 w-3 text-red-500" />
          </CardHeader>
          <CardContent className="py-0.5">
            <div className="text-xs leading-tight">
              <span className="font-semibold">{pendingOver10m.length}</span> &gt;10m pend.<br/>
              <span className="font-semibold">{awaitingOver5m.length}</span> &gt;5m esp. resp.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salud de la operación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="py-2"><CardTitle className="text-sm">Pendientes sin asignar</CardTitle></CardHeader>
          <CardContent className="py-2">
            <div className="text-xs text-muted-foreground mb-2">{pendingHuman.length} en cola</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {pendingHuman.slice(0,10).map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{c.username || c.user_id}</span>
                  <span className="text-muted-foreground">{new Date(c.updated_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
              {pendingHuman.length === 0 && (
                <div className="text-xs text-muted-foreground">Sin pendientes</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2"><CardTitle className="text-sm">Esperando respuesta</CardTitle></CardHeader>
          <CardContent className="py-2">
            <div className="text-xs text-muted-foreground mb-2">{awaitingResponse.length} requieren acción</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {awaitingResponse.slice(0,10).map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{c.username || c.user_id}</span>
                  <span className="text-red-600 font-medium">
                    {c.last_message_at ? Math.floor((now - new Date(c.last_message_at).getTime())/60000) : '—'}m
                  </span>
                </div>
              ))}
              {awaitingResponse.length === 0 && (
                <div className="text-xs text-muted-foreground">Sin conversaciones en espera</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2"><CardTitle className="text-sm">Carga por agente</CardTitle></CardHeader>
          <CardContent className="py-2">
            <div className="space-y-1 max-h-56 overflow-auto">
              {Object.keys(loadByAgent).length === 0 ? (
                <div className="text-xs text-muted-foreground">Sin asignaciones</div>
              ) : loadByAgentSorted.map(([email, count]) => (
                <div key={email} className="flex items-center justify-between text-xs">
                  <span className="truncate">{email}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tiempos de respuesta por agente */}
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardHeader className="py-2"><CardTitle className="text-sm">Tiempo de respuesta promedio por agente (7 días)</CardTitle></CardHeader>
          <CardContent className="py-2">
            {loadingResp ? (
              <div className="text-xs text-muted-foreground">Calculando...</div>
            ) : perAgentSorted.length === 0 ? (
              <div className="text-xs text-muted-foreground">Sin datos</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {perAgentSorted.map(([email, avg]) => (
                  <div key={email} className="flex items-center justify-between rounded-md border p-2 text-xs">
                    <span className="truncate pr-2">{email}</span>
                    <span className="font-semibold">{avg.toFixed(1)}m</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground mt-2">Muestras: {respSamples}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
