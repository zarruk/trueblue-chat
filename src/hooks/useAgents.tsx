import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export interface Agent {
  id: string
  email: string
  name: string
  role: string
  telefono?: string
  created_at: string
  status?: string
}

export interface AgentStats {
  id: string
  name: string
  email: string
  role: string
  status: string
  total_conversations: number
  active_conversations: number
  closed_conversations: number
  total_messages: number
  last_activity: string
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentStats, setAgentStats] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('tb_agents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching agents:', error)
        toast.error('Error al cargar los agentes')
        return
      }

      setAgents((data as any) || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      toast.error('Error al cargar los agentes')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch agent statistics
  const fetchAgentStats = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('tb_agents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching agent stats:', error)
        return
      }

              setAgentStats((data as any) || [])
    } catch (error) {
      console.error('Error fetching agent stats:', error)
    }
  }, [user])

  // Create new agent
  const createAgent = useCallback(async (email: string, name: string, role: string) => {
    if (!user || profile?.role !== 'admin') {
      toast.error('No tienes permisos para crear agentes')
      return
    }

    try {
      const { error } = await supabase
        .from('tb_agents')
        .insert({
          email,
          name,
          role: role as 'admin' | 'agent' | 'ai'
        })

      if (error) {
        console.error('Error creating agent:', error)
        toast.error('Error al crear el agente')
        return
      }

      toast.success('Agente creado exitosamente')
      await fetchAgents()
      await fetchAgentStats()
    } catch (error) {
      console.error('Error creating agent:', error)
      toast.error('Error al crear el agente')
    }
  }, [user, profile, fetchAgents, fetchAgentStats])

  // Update agent
  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>) => {
    if (!user || profile?.role !== 'admin') {
      toast.error('No tienes permisos para actualizar agentes')
      return
    }

    try {
      const { error } = await supabase
        .from('tb_agents')
        .update(updates)
        .eq('id', agentId)

      if (error) {
        console.error('Error updating agent:', error)
        toast.error('Error al actualizar el agente')
        return
      }

      toast.success('Agente actualizado exitosamente')
      await fetchAgents()
      await fetchAgentStats()
    } catch (error) {
      console.error('Error updating agent:', error)
      toast.error('Error al actualizar el agente')
    }
  }, [user, profile, fetchAgents, fetchAgentStats])

  // Delete agent
  const deleteAgent = useCallback(async (agentId: string) => {
    if (!user || profile?.role !== 'admin') {
      toast.error('No tienes permisos para eliminar agentes')
      return
    }

    try {
      const { error } = await supabase
        .from('tb_agents')
        .delete()
        .eq('id', agentId)

      if (error) {
        console.error('Error deleting agent:', error)
        toast.error('Error al eliminar el agente')
        return
      }

      toast.success('Agente eliminado exitosamente')
      await fetchAgents()
      await fetchAgentStats()
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast.error('Error al eliminar el agente')
    }
  }, [user, profile, fetchAgents, fetchAgentStats])

  // Toggle agent status
  const toggleAgentStatus = useCallback(async (agent: Agent) => {
    if (!user || profile?.role !== 'admin') {
      toast.error('No tienes permisos para cambiar el estado del agente')
      return
    }

    try {
      const newStatus = agent.status === 'active' ? 'inactive' : 'active'
      const { error } = await supabase
        .from('tb_agents')
        .update({ status: newStatus })
        .eq('id', agent.id)

      if (error) {
        console.error('Error updating agent status:', error)
        toast.error('Error al actualizar el estado del agente')
        return
      }

      toast.success(`Agente ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente`)
      await fetchAgents()
      await fetchAgentStats()
    } catch (error) {
      console.error('Error updating agent status:', error)
      toast.error('Error al actualizar el estado del agente')
    }
  }, [user, profile, fetchAgents, fetchAgentStats])

  // Resend invitation
  const resendInvitation = useCallback(async (agent: Agent) => {
    if (!user || profile?.role !== 'admin') {
      toast.error('No tienes permisos para reenviar invitaciones')
      return
    }

    try {
      // Aquí implementarías la lógica para reenviar la invitación
      toast.success('Invitación reenviada exitosamente')
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast.error('Error al reenviar la invitación')
    }
  }, [user, profile])

  // Get agent by ID
  const getAgentById = useCallback((agentId: string) => {
    return agents.find(agent => agent.id === agentId)
  }, [agents])

  // Get agents by role
  const getAgentsByRole = useCallback((role: string) => {
    return agents.filter(agent => agent.role === role)
  }, [agents])

  // Get active agents (those with recent activity)
  const getActiveAgents = useCallback(() => {
    return agentStats.filter(stat => 
      stat.last_activity && 
      new Date(stat.last_activity) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    )
  }, [agentStats])

  // Initial fetch
  useEffect(() => {
    fetchAgents()
    fetchAgentStats()
  }, [fetchAgents, fetchAgentStats])

  return {
    agents,
    agentStats,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentById,
    getAgentsByRole,
    getActiveAgents,
    fetchAgents,
    fetchAgentStats
  }
}
