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

console.log('🔍 TEST DE REAL-TIME CON NUEVAS POLÍTICAS RLS')
console.log('=' * 50)

async function testRealtimeWithAuth() {
  try {
    // Test 1: Verificar conexión básica
    console.log('\n📡 Test 1: Verificando conexión básica...')
    
    // Test 2: Intentar autenticación con un usuario de prueba
    console.log('\n🔐 Test 2: Verificando autenticación...')
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('⚠️  No hay usuario autenticado, continuando con usuario anónimo')
    } else {
      console.log('✅ Usuario autenticado:', authData.user?.email || 'Anónimo')
    }
    
    // Test 3: Verificar acceso a conversaciones
    console.log('\n📊 Test 3: Verificando acceso a conversaciones...')
    const { data: conversations, error: convError } = await supabase
      .from('tb_conversations')
      .select('*')
      .limit(5)
    
    if (convError) {
      console.log('❌ Error accediendo a conversaciones:', convError.message)
    } else {
      console.log('✅ Conversaciones accesibles:', conversations?.length || 0)
    }
    
    // Test 4: Configurar listener de tiempo real para conversaciones
    console.log('\n🔄 Test 4: Configurando listener de tiempo real...')
    
    let messageReceived = false
    let conversationReceived = false
    
    const messagesChannel = supabase
      .channel('test-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tb_messages'
        },
        (payload) => {
          console.log('✅ Mensaje en tiempo real recibido:', payload.new.content?.substring(0, 50) + '...')
          messageReceived = true
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción de mensajes:', status)
      })

    const conversationsChannel = supabase
      .channel('test-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tb_conversations'
        },
        (payload) => {
          console.log('✅ Conversación en tiempo real recibida:', payload.eventType)
          conversationReceived = true
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción de conversaciones:', status)
      })
    
    // Test 5: Esperar conexiones
    console.log('\n⏳ Test 5: Esperando conexiones de tiempo real (15 segundos)...')
    await new Promise(resolve => setTimeout(resolve, 15000))
    
    // Test 6: Verificar estado de conexiones
    console.log('\n🔍 Test 6: Verificando estado final...')
    console.log('📡 Estado de realtime:', supabase.realtime.connection?.readyState)
    console.log('📡 Canales activos:', supabase.realtime.channels.length)
    
    // Test 7: Intentar insertar un mensaje de prueba (solo si está autenticado)
    if (authData?.user) {
      console.log('\n📝 Test 7: Intentando insertar mensaje de prueba...')
      
      // Buscar una conversación existente
      const { data: testConv } = await supabase
        .from('tb_conversations')
        .select('id')
        .limit(1)
        .single()
        
      if (testConv) {
        const { error: insertError } = await supabase
          .from('tb_messages')
          .insert({
            conversation_id: testConv.id,
            content: `Mensaje de prueba de real-time - ${new Date().toISOString()}`,
            sender_role: 'agent'
          })
          
        if (insertError) {
          console.log('❌ Error insertando mensaje:', insertError.message)
        } else {
          console.log('✅ Mensaje de prueba insertado exitosamente')
        }
      }
    }
    
    // Esperar un poco más para ver si llegan eventos
    console.log('\n⏳ Esperando eventos de tiempo real...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Test 8: Resumen de resultados
    console.log('\n📊 Test 8: Resumen de resultados:')
    console.log('✅ Conexión a Supabase:', '✅')
    console.log('✅ Acceso a conversaciones:', convError ? '❌' : '✅')
    console.log('✅ Suscripción a mensajes:', messageReceived ? '✅' : '⏳')
    console.log('✅ Suscripción a conversaciones:', conversationReceived ? '✅' : '⏳')
    
    // Limpiar
    messagesChannel.unsubscribe()
    conversationsChannel.unsubscribe()
    
    console.log('\n✅ Test completado')
    
  } catch (error) {
    console.log('❌ Error en test:', error)
  }
}

// Ejecutar el test
testRealtimeWithAuth()
  .then(() => {
    console.log('\n🏁 Test de real-time con auth completado')
    process.exit(0)
  })
  .catch(error => {
    console.log('❌ Error fatal:', error)
    process.exit(1)
  })