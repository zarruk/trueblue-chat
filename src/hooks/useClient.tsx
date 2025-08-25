import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { CurrentClientInfo, ClientConfig } from '@/types/database'
import { useAuth } from './useAuth'

export function useClient() {
  const [clientInfo, setClientInfo] = useState<CurrentClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  // Obtener información del cliente actual
  const fetchClientInfo = async () => {
    if (!profile) {
      console.log('🔍 fetchClientInfo: No hay perfil disponible')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 fetchClientInfo: Profile client_id:', profile.client_id)
      
      // Si no hay client_id, usar el cliente por defecto
      const targetClientId = profile.client_id || '550e8400-e29b-41d4-a716-446655440000'
      
      console.log('🔍 fetchClientInfo: Target client_id:', targetClientId)
      
      // Intentar obtener información del cliente directamente
      console.log('🔍 Intentando obtener cliente directamente...')
      
      try {
        // Primero intentar con una consulta simple
        console.log('🔍 Intentando consulta simple...')
        const { data: simpleData, error: simpleError } = await supabase
          .from('clients')
          .select('id, name, slug')
          .eq('id', targetClientId)
          .maybeSingle()
          
        if (simpleError) {
          console.error('❌ Error en consulta simple:', simpleError)
          
          // Si falla, usar datos hardcodeados como fallback
          console.log('🔍 Usando fallback hardcodeado...')
          const fallbackClient = {
            id: targetClientId,
            name: 'Aztec',
            slug: 'aztec',
            domain: 'azteclab.co',
            logo_url: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
            primary_color: '#3B82F6',
            secondary_color: '#1E40AF',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            branding_config: {
              name: 'Aztec',
              shortName: 'AZ',
              logo: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
              primaryColor: '#3B82F6',
              secondaryColor: '#1E40AF'
            }
          }
          
          console.log('✅ Usando cliente fallback:', fallbackClient)
          setClientInfo(fallbackClient)
          return
        }
        
        if (!simpleData) {
          console.error('❌ Cliente no encontrado con ID:', targetClientId)
          
          // Usar fallback si no se encuentra
          console.log('🔍 Cliente no encontrado, usando fallback...')
          const fallbackClient = {
            id: targetClientId,
            name: 'Aztec',
            slug: 'aztec',
            domain: 'azteclab.co',
            logo_url: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
            primary_color: '#3B82F6',
            secondary_color: '#1E40AF',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            branding_config: {
              name: 'Aztec',
              shortName: 'AZ',
              logo: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
              primaryColor: '#3B82F6',
              secondaryColor: '#1E40AF'
            }
          }
          
          console.log('✅ Usando cliente fallback:', fallbackClient)
          setClientInfo(fallbackClient)
          return
        }
        
        console.log('✅ Cliente obtenido (consulta simple):', simpleData)
        
        // Intentar obtener configuraciones de branding
        let brandingConfig = null
        try {
          const { data: brandingData, error: brandingError } = await supabase
            .from('client_configs')
            .select('config_value')
            .eq('client_id', targetClientId)
            .eq('config_key', 'branding')
            .maybeSingle()

          if (!brandingError && brandingData) {
            try {
              brandingConfig = JSON.parse(brandingData.config_value)
            } catch (e) {
              console.warn('⚠️ Error parsing branding config:', e)
            }
          }
        } catch (e) {
          console.warn('⚠️ Error obteniendo branding config:', e)
        }

        // Construir objeto de información del cliente
        const clientInfo = {
          ...simpleData,
          domain: 'azteclab.co',
          logo_url: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          branding_config: brandingConfig || {
            name: simpleData.name,
            shortName: simpleData.name.substring(0, 2).toUpperCase(),
            logo: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF'
          }
        }

        console.log('✅ Información del cliente construida:', clientInfo)
        setClientInfo(clientInfo)
      } catch (error) {
        console.error('❌ Excepción general:', error)
        
        // Fallback final
        console.log('🔍 Excepción general, usando fallback final...')
        const fallbackClient = {
          id: targetClientId,
          name: 'Aztec',
          slug: 'aztec',
          domain: 'azteclab.co',
          logo_url: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          branding_config: {
            name: 'Aztec',
            shortName: 'AZ',
            logo: 'https://framerusercontent.com/images/vNczyX6ZmwhLPhsvtx36o1wPTc.svg?scale-down-to=512',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF'
          }
        }
        
        console.log('✅ Usando cliente fallback final:', fallbackClient)
        setClientInfo(fallbackClient)
      }
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
    console.log('🔍 getClientDisplayName: clientInfo:', clientInfo)
    console.log('🔍 getClientDisplayName: loading:', loading)
    
    if (!clientInfo) {
      console.log('🔍 getClientDisplayName: No hay clientInfo, retornando "Cargando..."')
      return 'Cargando...'
    }
    
    console.log('🔍 getClientDisplayName: clientInfo.name:', clientInfo.name)
    console.log('🔍 getClientDisplayName: clientInfo.branding_config:', clientInfo.branding_config)
    
    // Usar configuración de branding si está disponible
    if (clientInfo.branding_config?.name) {
      console.log('🔍 getClientDisplayName: Usando branding_config.name:', clientInfo.branding_config.name)
      return clientInfo.branding_config.name
    }
    
    // Fallback al nombre del cliente
    console.log('🔍 getClientDisplayName: Usando clientInfo.name:', clientInfo.name)
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

  // Cargar información del cliente al montar el hook o cuando cambie el perfil
  useEffect(() => {
    if (profile) {
      fetchClientInfo()
    }
  }, [profile])

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
