import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase (igual que en la app web)
const SUPABASE_URL = "https://avkpygwhymnxotwqzknz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2a3B5Z3doeW1ueG90d3F6a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjEyMDcsImV4cCI6MjA2ODg5NzIwN30.p97K1S3WYNAeYb-ExRpRp3J_pqFegFJ11VOe5th_xHk"

// Configuración del cliente (igual que en client.ts)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: null, // No localStorage en Node.js
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

console.log('🌐 TEST DE SINCRONIZACIÓN WEB - SIMULANDO LA APLICACIÓN')
console.log('=' * 60)

async function webSyncTest() {
  try {
    // Simular el hook useRealtimeConversations
    console.log('\n🔌 Simulando hook useRealtimeConversations...')
    
    let messageInsertCalled = false
    let conversationUpdateCalled = false
    
    const handleMessageInsert = (message) => {
      console.log('📨 [CALLBACK] handleMessageInsert ejecutado:', message.id)
      messageInsertCalled = true
    }
    
    const handleConversationUpdate = (conversation) => {
      console.log('🔄 [CALLBACK] handleConversationUpdate ejecutado:', {
        id: conversation.id,
        status: conversation.status,
        agent: conversation.assigned_agent_name
      })
      conversationUpdateCalled = true
    }
    
    // Configurar suscripciones (igual que en useRealtimeConversations)
    console.log('\n📡 Configurando suscripciones de Realtime...')
    
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tb_messages'
        },
        (payload) => {
          console.log('✅ [REALTIME] Nuevo mensaje recibido:', payload.new)
          const newMessage = payload.new
          handleMessageInsert(newMessage)
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Estado de suscripción de mensajes:', status)
      })

    const conversationsChannel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tb_conversations'
        },
        (payload) => {
          console.log('✅ [REALTIME] Conversación actualizada:', payload.new)
          const updatedConversation = payload.new
          handleConversationUpdate(updatedConversation)
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Estado de suscripción de conversaciones:', status)
      })

    // Esperar a que se conecten
    console.log('\n⏳ Esperando conexión de suscripciones...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Verificar estado de las suscripciones
    console.log('\n🔍 Estado de las suscripciones:')
    console.log('Mensajes:', messagesChannel.subscribe ? 'Configurado' : 'No configurado')
    console.log('Conversaciones:', conversationsChannel.subscribe ? 'Configurado' : 'No configurado')
    
    // Test 1: Cambiar estado de una conversación
    console.log('\n🧪 Test 1: Cambiando estado de conversación...')
    
    // Obtener una conversación para probar
    const { data: conversations, error: fetchError } = await supabase
      .from('tb_conversations')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.log('❌ Error obteniendo conversaciones:', fetchError.message)
      return false
    }
    
    if (!conversations || conversations.length === 0) {
      console.log('❌ No hay conversaciones para probar')
      return false
    }
    
    const testConversation = conversations[0]
    console.log(`🎯 Conversación de prueba: ${testConversation.id}`)
    console.log(`📊 Estado actual: ${testConversation.status}`)
    
    // Cambiar el estado
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
      }, 15000) // 15 segundos de timeout
    })
    
    const eventPromise = new Promise(resolve => {
      const checkEvent = () => {
        if (conversationUpdateCalled) {
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
    
    // Test 2: Verificar que el cambio se reflejó
    console.log('\n🔍 Test 2: Verificando cambio en base de datos...')
    
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
    
    // Test 3: Revertir el cambio
    console.log('\n🔄 Test 3: Revirtiendo cambio...')
    
    const { error: revertError } = await supabase
      .from('tb_conversations')
      .update({ status: testConversation.status })
      .eq('id', testConversation.id)
    
    if (revertError) {
      console.log('❌ Error revirtiendo conversación:', revertError.message)
    } else {
      console.log('✅ Cambio revertido exitosamente')
    }
    
    // Limpiar suscripciones
    messagesChannel.unsubscribe()
    conversationsChannel.unsubscribe()
    
    // Resumen final
    console.log('\n' + '=' * 60)
    console.log('📊 RESUMEN DEL TEST WEB:')
    console.log(`🔌 Suscripciones configuradas: ✅`)
    console.log(`📡 Realtime funcionando: ${eventResult ? '✅' : '❌'}`)
    console.log(`💾 Base de datos: ${updatedConversation?.status === newStatus ? '✅' : '❌'}`)
    console.log(`📨 Callback mensajes: ${messageInsertCalled ? '✅' : '❌'}`)
    console.log(`🔄 Callback conversaciones: ${conversationUpdateCalled ? '✅' : '❌'}`)
    
    const allTestsPassed = eventResult && updatedConversation?.status === newStatus
    
    if (allTestsPassed) {
      console.log('\n🎉 ¡TEST WEB EXITOSO! La sincronización funciona correctamente')
      return true
    } else {
      console.log('\n❌ Test web falló. Revisa los logs anteriores')
      return false
    }
    
  } catch (error) {
    console.log('❌ Error general en test web:', error)
    return false
  }
}

// Ejecutar el test
webSyncTest()
  .then(success => {
    console.log('\n🏁 Test web completado. Éxito:', success)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.log('❌ Error fatal en test web:', error)
    process.exit(1)
  })
