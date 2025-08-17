import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = "https://avkpygwhymnxotwqzknz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2a3B5Z3doeW1ueG90d3F6a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjEyMDcsImV4cCI6MjA2ODg5NzIwN30.p97K1S3WYNAeYb-ExRpRp3J_pqFegFJ11VOe5th_xHk"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

console.log('🔥 TEST DIRECTO DE REALTIME - DIAGNÓSTICO EXTREMO')
console.log('=' * 60)

async function testRealtimeNow() {
  try {
    // 1. Verificar conexión básica
    console.log('\n🔌 1. Verificando conexión básica...')
    const { data: conversations, error } = await supabase
      .from('tb_conversations')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Error de conexión:', error.message)
      return
    }
    
    console.log('✅ Conexión básica funciona')
    console.log('📊 Conversaciones disponibles:', conversations?.length || 0)
    
    if (!conversations || conversations.length === 0) {
      console.log('⚠️ No hay conversaciones para probar')
      return
    }
    
    // 2. Test de inserción manual en tb_messages
    console.log('\n📨 2. Probando inserción de mensaje...')
    
    const testMessage = {
      conversation_id: conversations[0].id,
      content: `Test message ${new Date().toISOString()}`,
      sender_role: 'agent',
      agent_email: 'test@test.com',
      agent_name: 'Test Agent'
    }
    
    console.log('📤 Insertando mensaje de prueba...')
    const { data: insertResult, error: insertError } = await supabase
      .from('tb_messages')
      .insert(testMessage)
      .select()
    
    if (insertError) {
      console.log('❌ Error insertando mensaje:', insertError.message)
      return
    }
    
    console.log('✅ Mensaje insertado exitosamente:', insertResult)
    
    // 3. Test de actualización de conversación
    console.log('\n🔄 3. Probando actualización de conversación...')
    
    const currentStatus = conversations[0].status
    const newStatus = currentStatus === 'pending_human' ? 'active_human' : 'pending_human'
    
    console.log(`📊 Cambiando estado de ${currentStatus} a ${newStatus}`)
    
    const { data: updateResult, error: updateError } = await supabase
      .from('tb_conversations')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversations[0].id)
      .select()
    
    if (updateError) {
      console.log('❌ Error actualizando conversación:', updateError.message)
      return
    }
    
    console.log('✅ Conversación actualizada exitosamente:', updateResult)
    
    // 4. Test de Realtime con promesas
    console.log('\n📡 4. Configurando escucha de Realtime...')
    
    let messageReceived = false
    let conversationReceived = false
    
    // Canal para mensajes
    const messageChannel = supabase
      .channel('test-messages-now')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tb_messages' },
        (payload) => {
          console.log('🎉 ¡MENSAJE DETECTADO EN REALTIME!', payload.new)
          messageReceived = true
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado canal mensajes:', status)
      })
    
    // Canal para conversaciones
    const conversationChannel = supabase
      .channel('test-conversations-now')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tb_conversations' },
        (payload) => {
          console.log('🎉 ¡CONVERSACIÓN DETECTADA EN REALTIME!', payload.new)
          conversationReceived = true
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado canal conversaciones:', status)
      })
    
    // Esperar 3 segundos para que se conecten
    console.log('\n⏳ Esperando 3 segundos para conexión...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 5. Hacer cambios reales para probar Realtime
    console.log('\n🧪 5. Haciendo cambios para probar Realtime...')
    
    // Insertar otro mensaje
    const testMessage2 = {
      conversation_id: conversations[0].id,
      content: `Realtime test message ${new Date().toISOString()}`,
      sender_role: 'user'
    }
    
    console.log('📤 Insertando segundo mensaje...')
    await supabase.from('tb_messages').insert(testMessage2)
    
    // Cambiar estado de vuelta
    console.log('🔄 Cambiando estado de vuelta...')
    await supabase
      .from('tb_conversations')
      .update({ 
        status: currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversations[0].id)
    
    // Esperar eventos de Realtime
    console.log('\n⏳ Esperando 5 segundos para eventos de Realtime...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 6. Resultado final
    console.log('\n📊 RESULTADOS DEL TEST:')
    console.log('=' * 40)
    console.log('🔌 Conexión básica:', '✅')
    console.log('📤 Inserción de mensajes:', '✅')
    console.log('🔄 Actualización de conversaciones:', '✅')
    console.log('📨 Realtime para mensajes:', messageReceived ? '✅' : '❌')
    console.log('🔄 Realtime para conversaciones:', conversationReceived ? '✅' : '❌')
    
    if (!messageReceived && !conversationReceived) {
      console.log('\n🚨 PROBLEMA IDENTIFICADO:')
      console.log('• Las operaciones en BD funcionan')
      console.log('• Pero Realtime NO está detectando los cambios')
      console.log('• Esto indica que las tablas NO están habilitadas para Realtime')
      
      console.log('\n🔧 SOLUCIÓN INMEDIATA:')
      console.log('Ve a Supabase Dashboard > SQL Editor y ejecuta:')
      console.log('ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;')
      console.log('ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;')
    } else {
      console.log('\n✅ ¡Realtime está funcionando! El problema debe estar en la app React.')
    }
    
    // Limpiar
    messageChannel.unsubscribe()
    conversationChannel.unsubscribe()
    
  } catch (error) {
    console.log('❌ Error en test:', error)
  }
}

// Ejecutar
testRealtimeNow()
  .then(() => {
    console.log('\n🏁 Test completado')
    process.exit(0)
  })
  .catch(error => {
    console.log('❌ Error fatal:', error)
    process.exit(1)
  })
