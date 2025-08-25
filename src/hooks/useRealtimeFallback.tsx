import { useEffect, useRef } from 'react'

// Hook de fallback para staging/producción - usa polling cuando Realtime falla
export function useRealtimeFallback({
  enabled = false,
  fetchConversations,
  fetchMessages,
  selectedConversationId
}: {
  enabled?: boolean
  fetchConversations: (options?: { background?: boolean }) => Promise<any> | void
  fetchMessages: (conversationId: string) => Promise<any> | void
  selectedConversationId?: string | null
}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!enabled) return
    
    console.log('⚠️ [FALLBACK] Iniciando polling como fallback para Realtime')
    
    // Polling moderado cada 3 segundos
    intervalRef.current = setInterval(() => {
      try {
        fetchConversations({ background: true })
        if (selectedConversationId) {
          fetchMessages(selectedConversationId)
        }
      } catch (e) {
        // Evitar romper el intervalo por errores temporales
        if (import.meta.env.DEV) {
          console.warn('⚠️ [FALLBACK] Error durante polling:', e)
        }
      }
    }, 3000)
    
    return () => {
      if (intervalRef.current) {
        console.log('🧹 [FALLBACK] Deteniendo polling')
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, fetchConversations, fetchMessages, selectedConversationId])
  
  return null
}
