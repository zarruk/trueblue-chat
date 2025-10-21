import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan SUPABASE_URL/SUPABASE_ANON_KEY (o VITE_*) en el entorno')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔍 TEST SIMPLE DE REALTIME - DIAGNÓSTICO')
console.log('=' * 50)

async function simpleRealtimeTest() {
  try {
    // Test 1: Verificar que podemos crear un canal
    console.log('\n📡 Test 1: Creando canal de prueba...')
    
    const channel = supabase.channel('simple-test')
    console.log('✅ Canal creado exitosamente')
    
    // Test 2: Verificar que podemos suscribirnos
    console.log('\n📡 Test 2: Suscribiendo al canal...')
    
    const subscription = channel.subscribe((status) => {
      console.log('📡 Estado de suscripción:', status)
    })
    
    console.log('✅ Suscripción iniciada')
    
    // Test 3: Esperar un poco para ver el estado
    console.log('\n⏳ Test 3: Esperando estado de suscripción...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Test 4: Verificar el estado de la conexión Realtime
    console.log('\n🔌 Test 4: Estado de la conexión Realtime...')
    console.log('Estado de realtime:', supabase.realtime.connection?.readyState)
    console.log('URL de realtime:', supabase.realtime.connection?.url)
    
    // Test 5: Intentar escuchar cambios en una tabla
    console.log('\n📊 Test 5: Configurando listener de tabla...')
    
    const tableChannel = supabase
      .channel('table-test')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tb_conversations' },
        (payload) => {
          console.log('✅ Evento de tabla recibido:', payload.eventType)
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción de tabla:', status)
      })
    
    console.log('✅ Listener de tabla configurado')
    
    // Test 6: Esperar más tiempo para ver si se conecta
    console.log('\n⏳ Test 6: Esperando conexión de tabla...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Test 7: Verificar si hay errores en la consola
    console.log('\n🔍 Test 7: Verificando estado final...')
    console.log('Estado de realtime después de 10s:', supabase.realtime.connection?.readyState)
    
    // Limpiar
    channel.unsubscribe()
    tableChannel.unsubscribe()
    
    console.log('\n✅ Test completado')
    
  } catch (error) {
    console.log('❌ Error en test:', error)
  }
}

// Ejecutar el test
simpleRealtimeTest()
  .then(() => {
    console.log('\n🏁 Test simple completado')
    process.exit(0)
  })
  .catch(error => {
    console.log('❌ Error fatal:', error)
    process.exit(1)
  })
