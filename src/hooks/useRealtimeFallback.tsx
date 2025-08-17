import { useEffect, useRef } from 'react'
import { useConversations } from './useConversations'

// Hook de fallback para staging - usa polling cuando Realtime falla
export function useRealtimeFallback(enabled: boolean = false) {
  const { fetchConversations, fetchMessages, selectedConversationId } = useConversations()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!enabled) return
    
    console.log('⚠️ [FALLBACK] Iniciando polling como fallback para Realtime')
    
    // Polling cada 3 segundos
    intervalRef.current = setInterval(() => {
      fetchConversations()
      if (selectedConversationId) {
        fetchMessages(selectedConversationId)
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
