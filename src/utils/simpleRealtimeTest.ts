import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export async function testRealtimeSimple() {
  console.log('🔄 SIMPLE TEST: Iniciando prueba básica de Realtime...')

  try {
    // Test muy simple: crear un canal y suscribirse
    const testChannel = supabase
      .channel('simple-test-channel')
      .on('presence', { event: 'sync' }, () => {
        console.log('✅ SIMPLE TEST: Presence sincronizado')
      })

    console.log('📡 SIMPLE TEST: Intentando suscribirse...')

    // Promesa con timeout
    const subscriptionResult = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('⏰ SIMPLE TEST: Timeout de 5 segundos')
        reject(new Error('Timeout'))
      }, 5000)

      testChannel.subscribe((status) => {
        console.log('📡 SIMPLE TEST: Estado de suscripción:', status)
        
        clearTimeout(timeout)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ SIMPLE TEST: ¡Suscripción exitosa!')
          resolve(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ SIMPLE TEST: Error en canal')
          reject(new Error('Channel error'))
        } else if (status === 'TIMED_OUT') {
          console.log('❌ SIMPLE TEST: Timeout de Supabase')
          reject(new Error('Supabase timeout'))
        } else if (status === 'CLOSED') {
          console.log('❌ SIMPLE TEST: Canal cerrado')
          reject(new Error('Channel closed'))
        }
      })
    })

    // Limpiar
    testChannel.unsubscribe()

    if (subscriptionResult) {
      console.log('🎉 SIMPLE TEST: Realtime funciona básicamente')
      toast.success('✅ Realtime básico funciona')
      return { success: true, message: 'Basic realtime working' }
    }

  } catch (error) {
    console.error('❌ SIMPLE TEST: Error:', error)
    toast.error(`❌ Error Realtime: ${error instanceof Error ? error.message : 'Desconocido'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function testConversationRealtime() {
  console.log('🔄 CONVERSATION TEST: Probando tiempo real para conversaciones...')

  try {
    const conversationChannel = supabase
      .channel('test-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tb_conversations'
      }, (payload) => {
        console.log('🎉 CONVERSATION TEST: ¡Cambio detectado!', payload)
        toast.success('✅ Conversaciones en tiempo real funcionan')
      })

    const subscribed = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)

      conversationChannel.subscribe((status) => {
        console.log('📡 CONVERSATION TEST: Estado:', status)
        clearTimeout(timeout)
        
        if (status === 'SUBSCRIBED') {
          resolve(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Subscription failed: ${status}`))
        }
      })
    })

    if (subscribed) {
      console.log('✅ CONVERSATION TEST: Escuchando cambios en tb_conversations')
      toast.info('✅ Listening for conversation changes. Try changing a conversation status.')
      
      // Mantener activo por 10 segundos para testing
      setTimeout(() => {
        conversationChannel.unsubscribe()
        console.log('🧹 CONVERSATION TEST: Canal cerrado')
      }, 10000)

      return { success: true, message: 'Listening for conversation changes' }
    }

  } catch (error) {
    console.error('❌ CONVERSATION TEST: Error:', error)
    toast.error(`❌ Error conversaciones: ${error instanceof Error ? error.message : 'Desconocido'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function runQuickTests() {
  console.log('🚀 QUICK TESTS: Ejecutando pruebas rápidas...')
  
  // Test 1: Conexión básica
  const basicTest = await testRealtimeSimple()
  if (!basicTest.success) {
    console.log('❌ QUICK TESTS: Falló test básico, no continúo')
    return false
  }

  // Esperar un momento
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: Conversaciones
  const conversationTest = await testConversationRealtime()
  if (!conversationTest.success) {
    console.log('❌ QUICK TESTS: Falló test de conversaciones')
    return false
  }

  console.log('🎉 QUICK TESTS: ¡Todos los tests pasaron!')
  toast.success('🎉 ¡Realtime funcionando correctamente!')
  return true
}
