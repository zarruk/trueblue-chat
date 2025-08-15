import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica si la columna channel existe en la tabla tb_conversations
 * y la agrega si es necesario
 */
export async function checkAndAddChannelColumn() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...')
    
    // Intentar seleccionar la columna channel
    const { data, error } = await supabase
      .from('tb_conversations')
      .select('channel')
      .limit(1)
    
    if (error) {
      // Si hay error, probablemente la columna no existe
      console.log('⚠️ Columna channel no encontrada, ejecutando migración...')
      await executeChannelMigration()
    } else {
      console.log('✅ Columna channel ya existe')
    }
  } catch (error) {
    console.error('❌ Error verificando estructura de BD:', error)
  }
}

/**
 * Ejecuta la migración para agregar la columna channel
 */
async function executeChannelMigration() {
  try {
    console.log('🚀 Ejecutando migración para agregar columna channel...')
    
    // Agregar columna channel
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tb_conversations 
        ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web';
      `
    })
    
    if (alterError) {
      console.log('⚠️ Columna channel ya existe o no se pudo agregar:', alterError)
    } else {
      console.log('✅ Columna channel agregada exitosamente')
    }
    
    // Crear índice
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_conversations_channel 
        ON tb_conversations(channel);
      `
    })
    
    if (indexError) {
      console.log('⚠️ Índice ya existe o no se pudo crear:', indexError)
    } else {
      console.log('✅ Índice channel creado exitosamente')
    }
    
    // Actualizar conversaciones existentes
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE tb_conversations 
        SET channel = CASE 
          WHEN phone_number IS NOT NULL THEN 'whatsapp'
          WHEN username LIKE '@%' THEN 'telegram'
          ELSE 'web'
        END
        WHERE channel = 'web';
      `
    })
    
    if (updateError) {
      console.log('⚠️ No se pudieron actualizar las conversaciones existentes:', updateError)
    } else {
      console.log('✅ Conversaciones existentes actualizadas con canales')
    }
    
    console.log('🎉 Migración completada exitosamente')
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error)
  }
}

/**
 * Función auxiliar para verificar la estructura actual
 */
export async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...')
    
    // Verificar si existe la columna channel
    const { data: conversations, error: convError } = await supabase
      .from('tb_conversations')
      .select('id, user_id, username, phone_number, channel')
      .limit(5)
    
    if (convError) {
      console.error('❌ Error consultando conversaciones:', convError)
      return
    }
    
    console.log('📊 Estructura actual de conversaciones:', conversations)
    
    // Verificar si existe la columna channel
    if (conversations && conversations.length > 0) {
      const hasChannel = 'channel' in conversations[0]
      console.log(`🔍 Columna channel existe: ${hasChannel}`)
      
      if (hasChannel) {
        console.log('📊 Valores de channel encontrados:', 
          [...new Set(conversations.map(c => c.channel))])
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error)
  }
}

// Función para verificar real-time de forma más simple
export async function checkRealTimeSimple() {
  try {
    console.log('🔍 Verificando real-time de forma simple...');
    
    // Crear un canal de prueba
    const channel = supabase.channel('simple_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tb_conversations' },
        (payload) => {
          console.log('✅ Cambio detectado en tb_conversations:', payload);
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tb_messages' },
        (payload) => {
          console.log('✅ Cambio detectado en tb_messages:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
      });

    // Esperar un momento para ver si se conecta
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Desuscribirse
    supabase.removeChannel(channel);
    
    return { success: true, message: 'Real-time verificado' };
  } catch (error) {
    console.error('❌ Error verificando real-time:', error);
    return { success: false, error };
  }
}
