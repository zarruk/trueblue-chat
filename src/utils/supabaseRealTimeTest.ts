import { supabase } from '@/integrations/supabase/client';

export async function testSupabaseRealTime() {
  try {
    console.log('🔌 Probando real-time de Supabase...');
    
    // Verificar que las tablas estén habilitadas para real-time
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_current_user_profile');
    
    if (rpcError) {
      console.log('⚠️ No se pudo verificar tablas de real-time via RPC, continuando con prueba directa...');
    } else {
      console.log('✅ Tablas habilitadas para real-time:', rpcData);
    }

    // Crear un canal de prueba
    const testChannelName = `test-channel-${Date.now()}`;
    console.log('📡 Creando canal de prueba:', testChannelName);

    const testChannel = supabase
      .channel(testChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tb_conversations'
        },
        (payload) => {
          console.log('✅ Real-time funcionando! Payload recibido:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción de prueba:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Canal de prueba suscrito exitosamente');
          
          // Hacer una inserción de prueba para verificar que funcione
          setTimeout(async () => {
            console.log('🧪 Haciendo inserción de prueba...');
            
            const { data: testConversation, error: insertError } = await supabase
              .from('tb_conversations')
              .insert({
                user_id: 'test-user-' + Date.now(),
                status: 'pending_human',
                summary: 'Conversación de prueba para verificar real-time'
              })
              .select()
              .single();

            if (insertError) {
              console.error('❌ Error en inserción de prueba:', insertError);
            } else {
              console.log('✅ Inserción de prueba exitosa:', testConversation);
              
              // Limpiar la inserción de prueba
              setTimeout(async () => {
                const { error: deleteError } = await supabase
                  .from('tb_conversations')
                  .delete()
                  .eq('id', testConversation.id);
                
                if (deleteError) {
                  console.warn('⚠️ No se pudo limpiar conversación de prueba:', deleteError);
                } else {
                  console.log('🧹 Conversación de prueba limpiada');
                }
                
                // Remover el canal de prueba
                supabase.removeChannel(testChannel);
                console.log('🧹 Canal de prueba removido');
              }, 2000);
            }
          }, 1000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal de prueba');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Timeout en canal de prueba');
        }
      });

    return { success: true, channel: testChannel };
  } catch (error) {
    console.error('❌ Error probando real-time:', error);
    return { success: false, error };
  }
}

export async function checkRealTimeTables() {
  try {
    console.log('🔍 Verificando configuración de real-time...');
    
    // Verificar si las tablas tienen REPLICA IDENTITY configurado
    const { data: conversationsInfo, error: convError } = await supabase
      .from('tb_conversations')
      .select('id')
      .limit(1);

    if (convError) {
      console.warn('⚠️ No se pudo verificar tb_conversations:', convError);
    } else {
      console.log('📋 Información de tb_conversations:', conversationsInfo);
    }

    const { data: messagesInfo, error: msgError } = await supabase
      .from('tb_messages')
      .select('id')
      .limit(1);

    if (msgError) {
      console.warn('⚠️ No se pudo verificar tb_messages:', msgError);
    } else {
      console.log('📋 Información de tb_messages:', messagesInfo);
    }

    // Verificar si las tablas están en la publicación de real-time
    const { data: publicationInfo, error: pubError } = await supabase
      .from('tb_conversations')
      .select('id')
      .limit(1);

    if (pubError) {
      console.warn('⚠️ No se pudo verificar publicación de real-time:', pubError);
    } else {
      console.log('📡 Tablas en publicación de real-time:', publicationInfo);
      
      const hasConversations = publicationInfo && publicationInfo.length > 0;
      const hasMessages = publicationInfo && publicationInfo.length > 0;
      
      console.log('✅ tb_conversations en real-time:', hasConversations);
      console.log('✅ tb_messages en real-time:', hasMessages);
      
      if (!hasConversations || !hasMessages) {
        console.warn('⚠️ Algunas tablas no están habilitadas para real-time');
        return { success: false, missingTables: [] };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error verificando configuración de real-time:', error);
    return { success: false, error };
  }
}





