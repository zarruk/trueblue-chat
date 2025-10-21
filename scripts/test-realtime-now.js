import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan SUPABASE_URL/SUPABASE_ANON_KEY (o VITE_*) en el entorno')
  process.exit(1)
}

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
    
    // Esperar eventos Realtime
    console.log('\n⏳ Esperando 5 segundos para eventos de Realtime...')
    let timeout = false
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        timeout = true
        resolve(false)
      }, 15000)
    })
    
    const eventPromise = new Promise(resolve => {
      const checkEvent = () => {
        if (conversationReceived) {
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
