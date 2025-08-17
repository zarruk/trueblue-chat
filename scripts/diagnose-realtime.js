import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = "https://avkpygwhymnxotwqzknz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2a3B5Z3doeW1ueG90d3F6a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjEyMDcsImV4cCI6MjA2ODg5NzIwN30.p97K1S3WYNAeYb-ExRpRp3J_pqFegFJ11VOe5th_xHk"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 DIAGNÓSTICO COMPLETO DE REALTIME')
console.log('=' * 50)

async function diagnoseRealtime() {
  try {
    // Test 1: Verificar configuración de Realtime en Supabase
    console.log('\n🔌 Test 1: Verificando configuración de Realtime...')
    
    // Verificar si las tablas están habilitadas para Realtime
    const { data: realtimeTables, error: realtimeError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'tb_conversations')
    
    if (realtimeError) {
      console.log('❌ Error verificando tablas de Realtime:', realtimeError.message)
    } else {
      console.log('✅ Tabla tb_conversations existe')
    }
    
    // Test 2: Verificar publicación supabase_realtime
    console.log('\n📡 Test 2: Verificando publicación supabase_realtime...')
    
    try {
      const { data: publicationData, error: pubError } = await supabase
        .rpc('get_realtime_publication_info')
      
      if (pubError) {
        console.log('⚠️ No se puede verificar publicación via RPC:', pubError.message)
        console.log('💡 Esto es normal, continuando con otros tests...')
      } else {
        console.log('✅ Información de publicación obtenida:', publicationData)
      }
    } catch (e) {
      console.log('⚠️ RPC no disponible, continuando...')
    }
    
    // Test 3: Verificar conexión básica
    console.log('\n🔌 Test 3: Verificando conexión básica...')
    
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
    
    // Test 4: Verificar suscripciones de Realtime
    console.log('\n📡 Test 4: Verificando suscripciones de Realtime...')
    
    let eventReceived = false
    let subscriptionStatus = 'unknown'
    let connectionState = 'unknown'
    
    const channel = supabase
      .channel('diagnose-test')
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
        
        // Verificar estado de la conexión
        if (supabase.realtime.connection) {
          connectionState = supabase.realtime.connection.readyState
          console.log('🔌 Estado de conexión Realtime:', connectionState)
        }
      })
    
    // Esperar a que se conecte
    console.log('\n⏳ Esperando conexión de Realtime...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('\n🔍 Estado después de 5 segundos:')
    console.log('Estado de suscripción:', subscriptionStatus)
    console.log('Estado de conexión:', connectionState)
    console.log('Evento recibido:', eventReceived)
    
    // Test 5: Intentar diferentes tipos de eventos
    console.log('\n🧪 Test 5: Probando diferentes tipos de eventos...')
    
    // Crear un canal para INSERT
    const insertChannel = supabase
      .channel('insert-test')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tb_conversations' },
        (payload) => {
          console.log('✅ Evento INSERT recibido:', payload.eventType)
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción INSERT:', status)
      })
    
    // Crear un canal para DELETE
    const deleteChannel = supabase
      .channel('delete-test')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tb_conversations' },
        (payload) => {
          console.log('✅ Evento DELETE recibido:', payload.eventType)
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción DELETE:', status)
      })
    
    // Esperar más tiempo
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Test 6: Verificar si hay problemas de permisos
    console.log('\n🔒 Test 6: Verificando permisos...')
    
    try {
      const { data: testUpdate, error: permError } = await supabase
        .from('tb_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversations[0].id)
        .select()
      
      if (permError) {
        console.log('❌ Error de permisos en UPDATE:', permError.message)
      } else {
        console.log('✅ Permisos de UPDATE funcionando')
      }
    } catch (e) {
      console.log('⚠️ Error verificando permisos:', e.message)
    }
    
    // Test 7: Verificar configuración del cliente
    console.log('\n⚙️ Test 7: Verificando configuración del cliente...')
    
    console.log('URL de Supabase:', SUPABASE_URL)
    console.log('Clave anónima:', SUPABASE_ANON_KEY.substring(0, 20) + '...')
    console.log('Configuración de Realtime:', supabase.realtime)
    
    // Limpiar suscripciones
    channel.unsubscribe()
    insertChannel.unsubscribe()
    deleteChannel.unsubscribe()
    
    // Resumen final
    console.log('\n' + '=' * 50)
    console.log('📊 RESUMEN DEL DIAGNÓSTICO:')
    console.log(`🔌 Conexión básica: ✅`)
    console.log(`📡 Suscripciones Realtime: ${subscriptionStatus === 'SUBSCRIBED' ? '✅' : '❌'}`)
    console.log(`🔌 Estado de conexión: ${connectionState === 1 ? '✅ Conectado' : connectionState === 0 ? '⏳ Conectando' : '❌ Desconectado'}`)
    console.log(`📨 Eventos recibidos: ${eventReceived ? '✅' : '❌'}`)
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:')
    
    if (subscriptionStatus !== 'SUBSCRIBED') {
      console.log('• ❌ Las suscripciones no se están conectando correctamente')
      console.log('• 🔧 Verificar configuración de Realtime en Supabase Dashboard')
    }
    
    if (connectionState !== 1) {
      console.log('• ❌ La conexión Realtime no está establecida')
      console.log('• 🔧 Verificar configuración de WebSockets en Supabase')
    }
    
    if (!eventReceived) {
      console.log('• ❌ No se están recibiendo eventos de la base de datos')
      console.log('• 🔧 Verificar que las tablas estén habilitadas para Realtime')
      console.log('• 🔧 Verificar permisos de la clave anónima')
    }
    
    if (subscriptionStatus === 'SUBSCRIBED' && connectionState === 1 && eventReceived) {
      console.log('• ✅ Realtime está funcionando correctamente')
      console.log('• 🔧 El problema puede estar en la aplicación React')
    }
    
    return subscriptionStatus === 'SUBSCRIBED' && connectionState === 1 && eventReceived
    
  } catch (error) {
    console.log('❌ Error general en diagnóstico:', error)
    return false
  }
}

// Ejecutar el diagnóstico
diagnoseRealtime()
  .then(success => {
    console.log('\n🏁 Diagnóstico completado. Realtime funcionando:', success)
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.log('❌ Error fatal en diagnóstico:', error)
    process.exit(1)
  })
