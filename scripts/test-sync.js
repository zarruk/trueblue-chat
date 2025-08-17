import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = "https://avkpygwhymnxotwqzknz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2a3B5Z3doeW1ueG90d3F6a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjEyMDcsImV4cCI6MjA2ODg5NzIwN30.p97K1S3WYNAeYb-ExRpRp3J_pqFegFJ11VOe5th_xHk"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🚀 INICIANDO TEST DE SINCRONIZACIÓN AUTOMATIZADO')
console.log('=' * 60)

async function testRealtimeSync() {
  try {
    // Test 1: Verificar conexión básica
    console.log('\n🔌 Test 1: Verificando conexión básica...')
    const { data: conversations, error: connError } = await supabase
      .from('tb_conversations')
      .select('*')
      .limit(1)
    
    if (connError) {
      console.log('❌ Error de conexión:', connError.message)
      return false
    }
    
    console.log('✅ Conexión exitosa')
    console.log(`📊 Conversaciones disponibles: ${conversations?.length || 0}`)
    
    if (!conversations || conversations.length === 0) {
      console.log('❌ No hay conversaciones para probar')
      return false
    }
    
    // Test 2: Verificar suscripciones de Realtime
    console.log('\n📡 Test 2: Verificando suscripciones de Realtime...')
    
    let eventReceived = false
    let subscriptionStatus = 'unknown'
    
    const channel = supabase
      .channel('test-sync-automated')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tb_conversations' },
        (payload) => {
          console.log('✅ Evento Realtime recibido:', payload.eventType)
          console.log('📊 Datos del evento:', payload.new)
          eventReceived = true
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status)
        subscriptionStatus = status
      })
    
    // Esperar a que se conecte
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    if (subscriptionStatus === 'CHANNEL_ERROR') {
      console.log('❌ Error en suscripción de Realtime')
      return false
    }
    
    if (subscriptionStatus === 'SUBSCRIBED') {
      console.log('✅ Suscripción de Realtime activa')
    } else {
      console.log('⚠️ Estado de suscripción inesperado:', subscriptionStatus)
    }
    
    // Test 3: Cambiar estado de una conversación
    console.log('\n🧪 Test 3: Cambiando estado de conversación...')
    
    const testConversation = conversations[0]
    console.log(`🎯 Conversación de prueba: ${testConversation.id}`)
    console.log(`📊 Estado actual: ${testConversation.status}`)
    
    const newStatus = testConversation.status === 'pending_human' ? 'active_human' : 'pending_human'
    console.log(`🔄 Cambiando estado a: ${newStatus}`)
    
    const { error: updateError } = await supabase
      .from('tb_conversations')
      .update({ status: newStatus })
      .eq('id', testConversation.id)
    
    if (updateError) {
      console.log('❌ Error actualizando conversación:', updateError.message)
      return false
    }
    
    console.log('✅ Estado cambiado en base de datos')
    console.log('⏳ Esperando evento Realtime...')
    
    // Esperar evento Realtime
    let timeout = false
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        timeout = true
        resolve(false)
      }, 10000) // 10 segundos de timeout
    })
    
    const eventPromise = new Promise(resolve => {
      const checkEvent = () => {
        if (eventReceived) {
          resolve(true)
        } else if (!timeout) {
          setTimeout(checkEvent, 100)
        } else {
          resolve(false)
        }
      }
      checkEvent()
    })
    
    const eventResult = await Promise.race([eventPromise, timeoutPromise])
    
    if (eventResult) {
      console.log('✅ Evento Realtime recibido exitosamente')
    } else {
      console.log('❌ Timeout esperando evento Realtime')
    }
    
    // Test 4: Verificar que el cambio se reflejó
    console.log('\n🔍 Test 4: Verificando cambio en base de datos...')
    
    const { data: updatedConversation, error: verifyError } = await supabase
      .from('tb_conversations')
      .select('*')
      .eq('id', testConversation.id)
      .single()
    
    if (verifyError) {
      console.log('❌ Error verificando conversación:', verifyError.message)
      return false
    }
    
    if (updatedConversation.status === newStatus) {
      console.log('✅ Estado actualizado correctamente en base de datos')
    } else {
      console.log('❌ Estado no se actualizó correctamente')
      console.log(`📊 Esperado: ${newStatus}, Actual: ${updatedConversation.status}`)
    }
    
    // Test 5: Revertir el cambio
    console.log('\n🔄 Test 5: Revirtiendo cambio...')
    
    const { error: revertError } = await supabase
      .from('tb_conversations')
      .update({ status: testConversation.status })
      .eq('id', testConversation.id)
    
    if (revertError) {
      console.log('❌ Error revirtiendo conversación:', revertError.message)
    } else {
      console.log('✅ Cambio revertido exitosamente')
    }
    
    // Limpiar suscripción
    channel.unsubscribe()
    
    // Resumen final
    console.log('\n' + '=' * 60)
    console.log('📊 RESUMEN DEL TEST:')
    console.log(`🔌 Conexión: ${connError ? '❌' : '✅'}`)
    console.log(`📡 Realtime: ${subscriptionStatus === 'SUBSCRIBED' ? '✅' : '❌'}`)
    console.log(`🧪 Evento: ${eventResult ? '✅' : '❌'}`)
    console.log(`💾 Base de datos: ${updatedConversation?.status === newStatus ? '✅' : '❌'}`)
    
    const allTestsPassed = !connError && subscriptionStatus === 'SUBSCRIBED' && eventResult && updatedConversation?.status === newStatus
    
    if (allTestsPassed) {
      console.log('\n🎉 ¡TODOS LOS TESTS PASARON! La sincronización funciona correctamente')
      return true
    } else {
      console.log('\n❌ Algunos tests fallaron. Revisa los logs anteriores')
      return false
    }
    
  } catch (error) {
    console.log('❌ Error general en test:', error)
    return false
  }
}

// Ejecutar el test
testRealtimeSync()
  .then(success => {
    console.log('\n🏁 Test completado. Éxito:', success)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.log('❌ Error fatal:', error)
    process.exit(1)
  })
