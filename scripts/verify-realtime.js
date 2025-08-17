import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = "https://avkpygwhymnxotwqzknz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2a3B5Z3doeW1ueG90d3F6a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjEyMDcsImV4cCI6MjA2ODg5NzIwN30.p97K1S3WYNAeYb-ExRpRp3J_pqFegFJ11VOe5th_xHk"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('✅ VERIFICACIÓN DE REALTIME DESPUÉS DE HABILITAR')
console.log('=' * 60)

async function verifyRealtime() {
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
    
    // Test 2: Configurar suscripción de Realtime
    console.log('\n📡 Test 2: Configurando suscripción de Realtime...')
    
    let eventReceived = false
    let subscriptionStatus = 'unknown'
    
    const channel = supabase
      .channel('verify-test')
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
    console.log('\n⏳ Esperando conexión de Realtime...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n🔍 Estado de la suscripción:')
    console.log('Estado:', subscriptionStatus)
    console.log('Evento recibido:', eventReceived)
    
    if (subscriptionStatus !== 'SUBSCRIBED') {
      console.log('❌ Suscripción no se conectó correctamente')
      return false
    }
    
    // Test 3: Cambiar estado de una conversación para probar Realtime
    console.log('\n🧪 Test 3: Probando Realtime con cambio real...')
    
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
    console.log('📊 RESUMEN DE LA VERIFICACIÓN:')
    console.log(`🔌 Conexión básica: ✅`)
    console.log(`📡 Suscripción Realtime: ${subscriptionStatus === 'SUBSCRIBED' ? '✅' : '❌'}`)
    console.log(`📨 Evento recibido: ${eventResult ? '✅' : '❌'}`)
    console.log(`💾 Base de datos: ${updatedConversation?.status === newStatus ? '✅' : '❌'}`)
    
    const allTestsPassed = subscriptionStatus === 'SUBSCRIBED' && eventResult && updatedConversation?.status === newStatus
    
    if (allTestsPassed) {
      console.log('\n🎉 ¡REALTIME FUNCIONANDO PERFECTAMENTE!')
      console.log('💡 Ahora la sincronización en la aplicación web debería funcionar')
      return true
    } else {
      console.log('\n❌ Realtime aún no funciona completamente')
      console.log('💡 Revisa los logs anteriores para identificar el problema')
      return false
    }
    
  } catch (error) {
    console.log('❌ Error general en verificación:', error)
    return false
  }
}

// Ejecutar la verificación
verifyRealtime()
  .then(success => {
    console.log('\n🏁 Verificación completada. Éxito:', success)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.log('❌ Error fatal en verificación:', error)
    process.exit(1)
  })
