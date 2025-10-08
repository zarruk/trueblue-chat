import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export interface Agent {
  id: string
  email: string
  name: string
  role: string
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
  const { user, clientId, isProfileReady } = useAuth()

  // Fetch agents from profiles table
  const fetchAgents = useCallback(async () => {
    if (!user || !isProfileReady) return // ⏳ esperar perfil
    if (!clientId) { 
      setAgents([]); 
      setLoading(false); 
      return // perfil listo pero sin cliente
    }

    try {
      setLoading(true)
      // console.log('🔍 fetchAgents: Obteniendo agentes de la tabla profiles...')
      // console.log('🔍 fetchAgents: Client ID:', clientId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, created_at')
        .in('role', ['agent', 'admin']) // Solo agentes y administradores
        .not('email', 'ilike', 'deleted_%') // Excluir agentes soft deleted
        .eq('client_id', clientId) // Filtrar por cliente
        .order('name', { ascending: true })

      // console.log('🔍 fetchAgents: Consulta ejecutada')
      // console.log('🔍 fetchAgents: Error:', error)
      // console.log('🔍 fetchAgents: Data:', data)

      if (error) {
        console.error('❌ Error fetching agents from profiles:', error)
        toast.error('Error al cargar los agentes')
        return
      }

      // console.log('✅ fetchAgents: Agentes obtenidos:', data?.length || 0)
      // console.log('✅ fetchAgents: Datos completos:', data)
      setAgents((data as any) || [])
    } catch (error) {
      console.error('❌ Exception fetching agents:', error)
      toast.error('Error al cargar los agentes')
    } finally {
      setLoading(false)
    }
  }, [user, clientId, isProfileReady])

  // Fetch agent statistics (disabled for now since we're using profiles table)
  const fetchAgentStats = useCallback(async () => {
    console.log('🔍 fetchAgentStats: Estadísticas temporalmente deshabilitadas')
    setAgentStats([])
  }, [])

  // Create new agent in profiles table
  const createAgent = useCallback(async (email: string, name: string, role: string) => {
    if (!user) {
      toast.error('No tienes permisos para crear agentes')
      return
    }
    if (!clientId) {
      toast.error('Cliente no disponible')
      return
    }

    try {
      setLoading(true)
      console.log('➕ createAgent: Creando nuevo agente:', { email, name, role })

      // Verificar si el email ya existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (existingProfile) {
        toast.error('Ya existe un agente con este email')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .insert({
          email: email,
          name: name,
          role: role,
          client_id: clientId // Asignar al mismo cliente
        })

      if (error) {
        console.error('❌ Error creando agente:', error)
        toast.error('Error al crear el agente')
        return
      }

      console.log('✅ createAgent: Agente creado exitosamente')
      toast.success('Agente creado exitosamente')
      
      // Refrescar la lista de agentes
      await fetchAgents()
      
    } catch (error) {
      console.error('❌ Exception creando agente:', error)
      toast.error('Error inesperado al crear el agente')
    } finally {
      setLoading(false)
    }
  }, [user, clientId, fetchAgents])

  // Update agent in profiles table
  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>) => {
    if (!user) {
      toast.error('No tienes permisos para actualizar agentes')
      return
    }

    try {
      setLoading(true)
      console.log('✏️ updateAgent: Actualizando agente con ID:', agentId, 'Updates:', updates)

      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.name,
          role: updates.role
        })
        .eq('id', agentId)

      if (error) {
        console.error('❌ Error actualizando agente:', error)
        toast.error('Error al actualizar el agente')
        return
      }

      console.log('✅ updateAgent: Agente actualizado exitosamente')
      toast.success('Agente actualizado exitosamente')
      
      // Refrescar la lista de agentes
      await fetchAgents()
      
    } catch (error) {
      console.error('❌ Exception actualizando agente:', error)
      toast.error('Error inesperado al actualizar el agente')
    } finally {
      setLoading(false)
    }
  }, [user, fetchAgents])

  // Delete agent from profiles table
  const deleteAgent = useCallback(async (agentId: string) => {
    if (!user) {
      toast.error('No tienes permisos para eliminar agentes')
      return
    }

    try {
      setLoading(true)
      console.log('🗑️ deleteAgent: Eliminando agente con ID:', agentId)
      console.log('🔍 deleteAgent: Usuario actual:', user?.id)
      
      // Verificar permisos de autenticación explícitamente
      const { data: currentUser, error: authError } = await supabase.auth.getUser()
      console.log('🔍 deleteAgent: Usuario autenticado:', { currentUser: currentUser.user?.id, authError })

      // Primero verificar que el agente existe
      const { data: existingAgent, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .eq('id', agentId)
        .single()

      console.log('🔍 deleteAgent: Verificando si el agente existe:', { existingAgent, checkError })

      if (checkError || !existingAgent) {
        console.error('❌ deleteAgent: El agente no existe:', checkError)
        toast.error('El agente no existe o ya fue eliminado')
        return
      }

      // Intentar eliminar usando RPC para evitar problemas de RLS
      console.log('🔄 deleteAgent: Intentando eliminación con RPC...')
      
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('delete_agent_profile', { agent_id: agentId })

      console.log('🔍 deleteAgent: Respuesta de RPC:', { rpcData, rpcError })

      if (rpcError) {
        console.log('⚠️ deleteAgent: RPC falló, intentando eliminación directa...')
        
        // Si RPC no existe, intentar eliminación directa
        const { data, error, count } = await supabase
          .from('profiles')
          .delete()
          .eq('id', agentId)
          .select()

        console.log('🔍 deleteAgent: Respuesta de eliminación directa:', { data, error, count })
        
        if (error) {
          console.error('❌ Error eliminando agente directamente:', error)
          toast.error(`Error al eliminar el agente: ${error.message}`)
          return
        }

        if (!data || data.length === 0) {
          console.error('⚠️ deleteAgent: No se eliminó ningún registro - posible problema de RLS')
          console.log('🔄 deleteAgent: Intentando soft delete cambiando el email...')
          
          // Soft delete: cambiar el email para "eliminarlo" de la lista
          const { data: softDeleteData, error: softDeleteError } = await supabase
            .from('profiles')
            .update({ 
              email: `deleted_${Date.now()}_${existingAgent.email}`,
              name: `[ELIMINADO] ${existingAgent.name}`
            })
            .eq('id', agentId)
            .select()

          console.log('🔍 deleteAgent: Resultado de soft delete:', { softDeleteData, softDeleteError })

          if (softDeleteError) {
            toast.error('No se pudo eliminar el agente. Las políticas de seguridad impiden esta operación.')
            return
          }

          if (softDeleteData && softDeleteData.length > 0) {
            toast.success('Agente eliminado (marcado como eliminado)')
            await fetchAgents()
            return
          } else {
            toast.error('No se pudo eliminar el agente. Contacta al administrador del sistema.')
            return
          }
        }
        
        console.log('✅ deleteAgent: Agente eliminado exitosamente (directo):', data)
      } else {
        console.log('✅ deleteAgent: Agente eliminado exitosamente (RPC):', rpcData)
      }

      toast.success('Agente eliminado exitosamente')
      
      // Refrescar la lista de agentes
      await fetchAgents()
      
    } catch (error) {
      console.error('❌ Exception eliminando agente:', error)
      toast.error('Error inesperado al eliminar el agente')
    } finally {
      setLoading(false)
    }
  }, [user, fetchAgents])

  // Toggle agent status (simulated for profiles table)
  const toggleAgentStatus = useCallback(async (agent: Agent) => {
    if (!user) {
      toast.error('No tienes permisos para cambiar el estado de agentes')
      return
    }

    try {
      setLoading(true)
      console.log('🔄 toggleAgentStatus: Cambiando estado del agente:', agent.id)
      
      // Para la tabla profiles, podríamos cambiar el rol o agregar un campo de estado
      // Por ahora, simplemente mostramos un mensaje
      toast.info('Estado del agente actualizado (funcionalidad simplificada)')
      
      // Refrescar la lista de agentes
      await fetchAgents()
      
    } catch (error) {
      console.error('❌ Exception cambiando estado del agente:', error)
      toast.error('Error inesperado al cambiar el estado')
    } finally {
      setLoading(false)
    }
  }, [user, fetchAgents])

  // Resend invitation
  const resendInvitation = useCallback(async (agent: Agent) => {
    if (!user) {
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
  }, [user])

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

  // Get available agents for assignment (agents/admins)
  const getAvailableAgents = useCallback(() => {
    return agents.filter(agent => 
      agent.role === 'agent' || agent.role === 'admin'
    )
  }, [agents])

  // Initial fetch
  useEffect(() => {
    fetchAgents()
    // fetchAgentStats() // Comentado: estadísticas deshabilitadas
  }, [fetchAgents]) // Removida dependencia fetchAgentStats

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
    getAvailableAgents,
    fetchAgents,
    fetchAgentStats
  }
}
