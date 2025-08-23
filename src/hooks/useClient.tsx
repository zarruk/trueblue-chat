import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { CurrentClientInfo, ClientConfig } from '@/types/database'

export function useClient() {
  const [clientInfo, setClientInfo] = useState<CurrentClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener información del cliente actual
  const fetchClientInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('current_client_info')
        .select('*')
        .single()

      if (fetchError) {
        console.error('❌ Error obteniendo información del cliente:', fetchError)
        setError(fetchError.message)
        return
      }

      console.log('✅ Información del cliente obtenida:', data)
      setClientInfo(data)
    } catch (err) {
      console.error('❌ Excepción obteniendo información del cliente:', err)
      setError('Error inesperado obteniendo información del cliente')
    } finally {
      setLoading(false)
    }
  }

  // Obtener configuración específica del cliente
  const getClientConfig = async (configKey: string): Promise<any> => {
    try {
      const { data, error } = await supabase
        .rpc('get_client_config', { config_key: configKey })

      if (error) {
        console.error(`❌ Error obteniendo configuración ${configKey}:`, error)
        return null
      }

      return data
    } catch (err) {
      console.error(`❌ Excepción obteniendo configuración ${configKey}:`, err)
      return null
    }
  }

  // Obtener configuración de branding
  const getBrandingConfig = async () => {
    return await getClientConfig('branding')
  }

  // Obtener configuración de features
  const getFeaturesConfig = async () => {
    return await getClientConfig('features')
  }

  // Obtener configuración de límites
  const getLimitsConfig = async () => {
    return await getClientConfig('limits')
  }

  // Actualizar configuración del cliente
  const updateClientConfig = async (configKey: string, configValue: any) => {
    try {
      if (!clientInfo) {
        throw new Error('No hay información del cliente disponible')
      }

      const { error } = await supabase
        .from('client_configs')
        .upsert({
          client_id: clientInfo.id,
          config_key: configKey,
          config_value: configValue
        })

      if (error) {
        console.error(`❌ Error actualizando configuración ${configKey}:`, error)
        throw error
      }

      console.log(`✅ Configuración ${configKey} actualizada`)
      
      // Refrescar información del cliente
      await fetchClientInfo()
      
      return true
    } catch (err) {
      console.error(`❌ Excepción actualizando configuración ${configKey}:`, err)
      throw err
    }
  }

  // Obtener nombre del cliente para mostrar
  const getClientDisplayName = (): string => {
    if (!clientInfo) return 'Cargando...'
    
    // Usar configuración de branding si está disponible
    if (clientInfo.branding_config?.name) {
      return clientInfo.branding_config.name
    }
    
    // Fallback al nombre del cliente
    return clientInfo.name
  }

  // Obtener nombre corto del cliente
  const getClientShortName = (): string => {
    if (!clientInfo) return '...'
    
    // Usar configuración de branding si está disponible
    if (clientInfo.branding_config?.shortName) {
      return clientInfo.branding_config.shortName
    }
    
    // Fallback: primeras dos letras del nombre
    return clientInfo.name.substring(0, 2).toUpperCase()
  }

  // Obtener logo del cliente
  const getClientLogo = (): string | null => {
    if (!clientInfo) return null
    
    // Usar configuración de branding si está disponible
    if (clientInfo.branding_config?.logo) {
      return clientInfo.branding_config.logo
    }
    
    // Fallback al logo del cliente
    return clientInfo.logo_url
  }

  // Obtener colores del cliente
  const getClientColors = () => {
    if (!clientInfo) {
      return {
        primary: '#3B82F6',
        secondary: '#1E40AF'
      }
    }
    
    return {
      primary: clientInfo.primary_color,
      secondary: clientInfo.secondary_color
    }
  }

  // Verificar si una feature está habilitada
  const isFeatureEnabled = async (featureName: string): Promise<boolean> => {
    try {
      const features = await getFeaturesConfig()
      return features?.[featureName] === true
    } catch (err) {
      console.error(`❌ Error verificando feature ${featureName}:`, err)
      return false
    }
  }

  // Obtener límite específico
  const getLimit = async (limitName: string): Promise<number> => {
    try {
      const limits = await getLimitsConfig()
      return limits?.[limitName] || 0
    } catch (err) {
      console.error(`❌ Error obteniendo límite ${limitName}:`, err)
      return 0
    }
  }

  // Cargar información del cliente al montar el hook
  useEffect(() => {
    fetchClientInfo()
  }, [])

  return {
    // Estado
    clientInfo,
    loading,
    error,
    
    // Acciones
    fetchClientInfo,
    getClientConfig,
    getBrandingConfig,
    getFeaturesConfig,
    getLimitsConfig,
    updateClientConfig,
    
    // Utilidades
    getClientDisplayName,
    getClientShortName,
    getClientLogo,
    getClientColors,
    isFeatureEnabled,
    getLimit,
    
    // Refrescar datos
    refresh: fetchClientInfo
  }
}
