import { createClient } from '@supabase/supabase-js'

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

console.log('🎉 TEST FINAL - ¿FUNCIONA AHORA?')
console.log('=' * 40)

async function finalTest() {
  try {
    // 1. Verificar conversaciones
    console.log('\n1. 📋 Obteniendo conversaciones...')
    const { data: conversations, error: convError } = await supabase
      .from('tb_conversations')
      .select('*')
      .limit(1)
    
    if (convError) {
      console.log('❌ Error:', convError.message)
      return
    }
    
    console.log('✅ Conversaciones:', conversations.length)
    
    if (!conversations.length) {
      console.log('❌ No hay conversaciones')
      return
    }

    // 2. Configurar escucha de Realtime ANTES de hacer cambios
    console.log('\n2. 📡 Configurando Realtime...')
    
    let messageReceived = false
    let conversationReceived = false
    
    const messageChannel = supabase
      .channel('final-test-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'tb_messages'
      }, (payload) => {
        console.log('🎉 ¡MENSAJE DETECTADO!', payload.new.content)
        messageReceived = true
      })
      .subscribe((status) => {
        console.log('📡 Canal mensajes:', status)
      })

    const conversationChannel = supabase
      .channel('final-test-conversations')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tb_conversations'
      }, (payload) => {
        console.log('🎉 ¡CONVERSACIÓN ACTUALIZADA!', payload.new.status)
        conversationReceived = true
      })
      .subscribe((status) => {
        console.log('📡 Canal conversaciones:', status)
      })

    // Esperar conexión
    console.log('\n⏳ Esperando conexión Realtime...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 3. Insertar mensaje
    console.log('\n3. 📨 Insertando mensaje...')
    const { data: messageResult, error: messageError } = await supabase
      .from('tb_messages')
      .insert({
        conversation_id: conversations[0].id,
        content: `Test final ${new Date().toISOString()}`,
        sender_role: 'agent',
        agent_name: 'Test Agent'
      })
      .select()
    
    if (messageError) {
      console.log('❌ Error insertando mensaje:', messageError.message)
    } else {
      console.log('✅ Mensaje insertado:', messageResult[0].content)
    }

    // 4. Actualizar conversación
    console.log('\n4. 🔄 Actualizando conversación...')
    const newStatus = conversations[0].status === 'pending_human' ? 'active_human' : 'pending_human'
    
    const { data: convResult, error: convUpdateError } = await supabase
      .from('tb_conversations')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversations[0].id)
      .select()
    
    if (convUpdateError) {
      console.log('❌ Error actualizando conversación:', convUpdateError.message)
    } else {
      console.log('✅ Conversación actualizada:', convResult[0].status)
    }

    // 5. Esperar eventos Realtime
    console.log('\n5. ⏳ Esperando eventos Realtime...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 6. Resultado final
    console.log('\n📊 RESULTADO FINAL:')
    console.log('=' * 30)
    console.log('📨 Inserción de mensaje:', messageError ? '❌' : '✅')
    console.log('🔄 Actualización conversación:', convUpdateError ? '❌' : '✅')
    console.log('📡 Realtime mensaje:', messageReceived ? '✅' : '❌')
    console.log('📡 Realtime conversación:', conversationReceived ? '✅' : '❌')

    const allWorking = !messageError && !convUpdateError && messageReceived && conversationReceived

    if (allWorking) {
      console.log('\n🎉🎉🎉 ¡TODO FUNCIONA! 🎉🎉🎉')
      console.log('🔥 La sincronización en tiempo real está ACTIVA')
      console.log('✨ Ahora la aplicación debe funcionar perfectamente')
    } else {
      console.log('\n🚨 Aún hay problemas:')
      if (messageError || convUpdateError) {
        console.log('• RLS aún bloquea operaciones')
      }
      if (!messageReceived || !conversationReceived) {
        console.log('• Realtime no está recibiendo eventos')
      }
    }

    // Limpiar
    messageChannel.unsubscribe()
    conversationChannel.unsubscribe()

  } catch (error) {
    console.log('❌ Error:', error)
  }
}

finalTest()
  .then(() => {
    console.log('\n🏁 Test final completado')
    process.exit(0)
  })
  .catch(error => {
    console.log('❌ Error fatal:', error)
    process.exit(1)
  })
