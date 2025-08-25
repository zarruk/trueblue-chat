import { useEffect } from 'react'
import { useClient } from '@/hooks/useClient'

export function DynamicTitle() {
  const { clientInfo, loading } = useClient()

  useEffect(() => {
    console.log('🔍 DynamicTitle: clientInfo:', clientInfo)
    console.log('🔍 DynamicTitle: loading:', loading)
    
    if (!loading && clientInfo) {
      const clientName = clientInfo.branding_config?.name || clientInfo.name || 'Chat Management'
      console.log('🔍 DynamicTitle: Estableciendo título:', `Chat Management - ${clientName}`)
      document.title = `Chat Management - ${clientName}`
    } else if (loading) {
      console.log('🔍 DynamicTitle: Estableciendo título de carga')
      document.title = 'Chat Management - Cargando...'
    } else {
      console.log('🔍 DynamicTitle: Estableciendo título por defecto')
      document.title = 'Chat Management'
    }
  }, [clientInfo, loading])

  return null // Este componente no renderiza nada visual
}
