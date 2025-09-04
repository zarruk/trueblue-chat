import { supabase } from '@/integrations/supabase/client'
// Notificaciones deshabilitadas en toda la app
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const

export class RealtimeDebugger {
  private testChannels: any[] = []

  async testRealtimeConnection() {
    console.log('🔍 DEBUGGING: Iniciando test de conexión Realtime...')
    
    try {
      // 1. Verificar estado de la conexión
      const connectionState = supabase.realtime.connection
      console.log('📡 Estado de conexión Realtime:', connectionState)
      
      // 2. Verificar configuración de Supabase
      console.log('⚙️ URL de Supabase configurada')
      console.log('🔑 Anon Key presente (oculta)')
      
      // 3. Test básico de canal
      console.log('🧪 Creando canal de test...')
      const testChannel = supabase
        .channel('realtime-test')
        .on('presence', { event: 'sync' }, () => {
          console.log('✅ Test: Presence sincronizado')
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('✅ Test: Usuario se unió:', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('✅ Test: Usuario se fue:', key, leftPresences)
        })
        
      const subscriptionPromise = new Promise((resolve, reject) => {
        testChannel.subscribe((status) => {
          console.log('📡 Estado de suscripción de test:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Test: Canal suscrito exitosamente')
            resolve(status)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Test: Error en canal')
            reject(new Error('Canal error'))
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Test: Timeout de conexión')
            reject(new Error('Timeout'))
          }
        })
      })
      
      // Timeout de 10 segundos para el test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de 10 segundos')), 10000)
      })
      
      await Promise.race([subscriptionPromise, timeoutPromise])
      
      // 4. Limpiar canal de test
      testChannel.unsubscribe()
      
      console.log('✅ DEBUGGING: Test de conexión Realtime EXITOSO')
      toast.success('Conexión Realtime funcionando correctamente')
      return { success: true, message: 'Realtime working' }
      
    } catch (error) {
      console.error('❌ DEBUGGING: Error en test de Realtime:', error)
      toast.error(`Error de Realtime: ${error instanceof Error ? error.message : 'Desconocido'}`)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async testTableRealtimeEnabled() {
    console.log('🔍 DEBUGGING: Verificando si las tablas tienen Realtime habilitado...')
    
    try {
      // Test específico para las tablas de la aplicación
      const tables = ['tb_conversations', 'tb_messages', 'profiles']
      
      for (const table of tables) {
        console.log(`🧪 Testing tabla: ${table}`)
        
        const testChannel = supabase
          .channel(`test-${table}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: table
          }, (payload) => {
            console.log(`✅ Realtime funcionando para ${table}:`, payload)
          })
        
        const subscribed = await new Promise((resolve) => {
          testChannel.subscribe((status) => {
            console.log(`📡 Estado suscripción ${table}:`, status)
            resolve(status === 'SUBSCRIBED')
          })
        })
        
        if (subscribed) {
          console.log(`✅ Tabla ${table}: Realtime HABILITADO`)
          toast.success(`Realtime habilitado para ${table}`)
        } else {
          console.log(`❌ Tabla ${table}: Realtime NO habilitado`)
          toast.error(`Realtime NO habilitado para ${table}`)
        }
        
        this.testChannels.push(testChannel)
        
        // Esperar un poco entre tests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      return { success: true, message: 'Table tests completed' }
      
    } catch (error) {
      console.error('❌ DEBUGGING: Error en test de tablas:', error)
      toast.error(`Error test de tablas: ${error instanceof Error ? error.message : 'Desconocido'}`)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async testMessageInsert() {
    console.log('🔍 DEBUGGING: Test de inserción de mensaje en tiempo real...')
    
    try {
      // Crear canal para escuchar inserts
      const listenChannel = supabase
        .channel('test-message-insert')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'tb_messages'
        }, (payload) => {
          console.log('🎉 ¡Mensaje detectado en tiempo real!:', payload.new)
          toast.success('¡Tiempo real funcionando! Mensaje detectado')
        })
      
      await new Promise((resolve) => {
        listenChannel.subscribe((status) => {
          console.log('📡 Canal de escucha listo:', status)
          if (status === 'SUBSCRIBED') resolve(true)
        })
      })
      
      console.log('✅ DEBUGGING: Canal de escucha activo. Inserta un mensaje para probar.')
      toast.info('Test listo: envía un mensaje para ver si funciona el tiempo real')
      
      this.testChannels.push(listenChannel)
      
      return { success: true, message: 'Listening for message inserts' }
      
    } catch (error) {
      console.error('❌ DEBUGGING: Error en test de insert:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  cleanup() {
    console.log('🧹 DEBUGGING: Limpiando canales de test...')
    this.testChannels.forEach(channel => {
      channel.unsubscribe()
    })
    this.testChannels = []
    toast.info('Tests de Realtime finalizados')
  }

  async runFullDiagnostic() {
    console.log('🚀 DEBUGGING: Iniciando diagnóstico completo de Realtime...')
    
    await this.testRealtimeConnection()
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await this.testTableRealtimeEnabled()
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await this.testMessageInsert()
    
    console.log('🏁 DEBUGGING: Diagnóstico completo finalizado')
    
    // Limpiar después de 30 segundos
    setTimeout(() => {
      this.cleanup()
    }, 30000)
  }
}

export const realtimeDebugger = new RealtimeDebugger()

// Función para testing rápido
export async function quickRealtimeTest() {
  console.log('⚡ QUICK TEST: Verificación rápida de Realtime...')
  
  try {
    const result = await realtimeDebugger.testRealtimeConnection()
    if (result.success) {
      console.log('✅ QUICK TEST: Realtime básico funcionando')
      return true
    } else {
      console.log('❌ QUICK TEST: Problemas con Realtime básico')
      return false
    }
  } catch (error) {
    console.error('❌ QUICK TEST: Error:', error)
    return false
  }
}
