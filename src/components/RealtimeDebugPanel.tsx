import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, AlertCircle, CheckCircle, RefreshCw, Database, MessageSquare } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Conversation } from '@/hooks/useConversations'

interface RealtimeDebugPanelProps {
  conversations: Conversation[]
  updateConversationStatus: (conversationId: string, status: Conversation['status']) => Promise<void>
}

export function RealtimeDebugPanel({ conversations, updateConversationStatus }: RealtimeDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setTestResults([])
  }

  // Test 1: Verificar conexión básica de Supabase
  const testSupabaseConnection = async () => {
    try {
      addResult('🔌 Probando conexión básica de Supabase...')
      const { data, error } = await supabase.from('tb_conversations').select('count').limit(1)
      
      if (error) {
        addResult(`❌ Error de conexión: ${error.message}`)
        setConnectionStatus('disconnected')
        return false
      }
      
      addResult('✅ Conexión a Supabase exitosa')
      setConnectionStatus('connected')
      return true
    } catch (error) {
      addResult(`❌ Error inesperado: ${error}`)
      setConnectionStatus('disconnected')
      return false
    }
  }

  // Test 2: Verificar suscripciones de Realtime
  const testRealtimeSubscriptions = async () => {
    try {
      addResult('📡 Probando suscripciones de Realtime...')
      
      let subscriptionReceived = false
      let subscriptionError = false
      
      const channel = supabase
        .channel('test-sync')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tb_conversations' },
          (payload) => {
            addResult(`✅ Evento Realtime recibido: ${payload.eventType}`)
            subscriptionReceived = true
          }
        )
        .subscribe((status) => {
          addResult(`📡 Estado de suscripción: ${status}`)
          if (status === 'CHANNEL_ERROR') {
            subscriptionError = true
          }
        })

      // Esperar un poco para ver si se conecta
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (subscriptionError) {
        addResult('❌ Error en suscripción de Realtime')
        return false
      }
      
      if (subscriptionReceived) {
        addResult('✅ Suscripciones de Realtime funcionando')
        return true
      } else {
        addResult('⚠️ Suscripciones de Realtime configuradas pero sin eventos')
        return true
      }
    } catch (error) {
      addResult(`❌ Error probando Realtime: ${error}`)
      return false
    }
  }

  // Test 3: Test de sincronización REAL
  const testRealSync = async () => {
    try {
      addResult('🧪 Iniciando test de sincronización REAL...')
      
      if (conversations.length === 0) {
        addResult('❌ No hay conversaciones para probar')
        return false
      }

      // Seleccionar la primera conversación
      const testConversation = conversations[0]
      addResult(`🎯 Usando conversación de prueba: ${testConversation.id}`)
      addResult(`📊 Estado actual: ${testConversation.status}`)
      addResult(`👤 Agente asignado: ${testConversation.assigned_agent_name || 'Ninguno'}`)

      // Cambiar el estado de la conversación
      const newStatus = testConversation.status === 'pending_human' ? 'active_human' : 'pending_human'
      addResult(`🔄 Cambiando estado de ${testConversation.status} a ${newStatus}...`)
      
      const { error } = await updateConversationStatus(testConversation.id, newStatus)
      
      if (error) {
        addResult(`❌ Error cambiando estado: ${error}`)
        return false
      }

      addResult('✅ Estado cambiado en base de datos')
      addResult('⏳ Esperando 3 segundos para verificar sincronización...')
      
      // Esperar para ver si se sincroniza
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verificar si el estado cambió en el estado local
      const updatedConversation = conversations.find(c => c.id === testConversation.id)
      if (updatedConversation && updatedConversation.status === newStatus) {
        addResult('✅ Sincronización AUTOMÁTICA funcionando!')
        return true
      } else {
        addResult('❌ Sincronización AUTOMÁTICA falló - estado no se actualizó')
        addResult(`📊 Estado esperado: ${newStatus}, Estado actual: ${updatedConversation?.status}`)
        return false
      }
      
    } catch (error) {
      addResult(`❌ Error en test de sincronización: ${error}`)
      return false
    }
  }

  // Test 4: Test completo de sincronización
  const runFullSyncTest = async () => {
    setIsRunning(true)
    clearResults()
    
    addResult('🚀 INICIANDO TEST COMPLETO DE SINCRONIZACIÓN')
    addResult('=' * 50)
    
    try {
      // Test 1: Conexión básica
      const connectionOk = await testSupabaseConnection()
      if (!connectionOk) {
        addResult('❌ Test falló en conexión básica')
        setIsRunning(false)
        return
      }
      
      // Test 2: Suscripciones Realtime
      const realtimeOk = await testRealtimeSubscriptions()
      if (!realtimeOk) {
        addResult('❌ Test falló en suscripciones Realtime')
        setIsRunning(false)
        return
      }
      
      // Test 3: Sincronización real
      const syncOk = await testRealSync()
      if (!syncOk) {
        addResult('❌ Test falló en sincronización automática')
        setIsRunning(false)
        return
      }
      
      addResult('🎉 ¡TODOS LOS TESTS PASARON! La sincronización funciona correctamente')
      
    } catch (error) {
      addResult(`❌ Error general en test: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  // Test 5: Verificar estado actual de las conversaciones
  const checkCurrentState = () => {
    addResult('📊 ESTADO ACTUAL DE LAS CONVERSACIONES:')
    addResult(`Total de conversaciones: ${conversations.length}`)
    
    conversations.forEach((conv, index) => {
      addResult(`${index + 1}. ID: ${conv.id.substring(0, 8)}... | Estado: ${conv.status} | Agente: ${conv.assigned_agent_name || 'Ninguno'}`)
    })
  }

  return (
    <>
      {/* Botón flotante para mostrar/ocultar el panel - OCULTO */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 hidden"
        variant="outline"
        size="sm"
      >
        {isVisible ? '🔒 Ocultar Debug' : '🐛 Debug Realtime'}
      </Button>

      {/* Panel de debug */}
      {isVisible && (
        <Card className="fixed bottom-20 right-4 w-96 max-h-96 z-40 bg-white shadow-lg border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Debug Realtime
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'} className="text-xs">
                {connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'disconnected' ? 'Desconectado' : 'Desconocido'}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Botones de test */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={testSupabaseConnection}
                disabled={isRunning}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Database className="h-3 w-3 mr-1" />
                Conexión
              </Button>

              <Button
                onClick={testRealtimeSubscriptions}
                disabled={isRunning}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Realtime
              </Button>
            </div>

            <Button
              onClick={testRealSync}
              disabled={isRunning}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              {isRunning ? 'Probando...' : 'Test Sincronización'}
            </Button>

            <Button
              onClick={runFullSyncTest}
              disabled={isRunning}
              variant="default"
              size="sm"
              className="w-full text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-2" />
              {isRunning ? 'Ejecutando...' : 'Test Completo'}
            </Button>

            <Button
              onClick={checkCurrentState}
              disabled={isRunning}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <AlertCircle className="h-3 w-3 mr-2" />
              Estado Actual
            </Button>

            <Button
              onClick={clearResults}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              Limpiar Logs
            </Button>
          </CardContent>

          {/* Logs de resultados */}
          <div className="px-4 pb-4">
            <div className="text-xs font-mono bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
              {testResults.length === 0 ? (
                <span className="text-gray-500">Ejecuta un test para ver los resultados...</span>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
