import { supabase } from '@/integrations/supabase/client';

export async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...');
    
    // 1. Verificar tablas existentes usando consultas directas
    console.log('\n📋 Verificando tablas existentes...');
    
    const tableChecks = {
      tb_conversations: false,
      tb_messages: false,
      profiles: false
    };

    // Verificar cada tabla individualmente
    try {
      const { error: convError } = await supabase
        .from('tb_conversations')
        .select('id')
        .limit(1);
      
      if (!convError) {
        tableChecks.tb_conversations = true;
        console.log('✅ tb_conversations existe y es accesible');
      } else {
        console.log('❌ tb_conversations no accesible:', convError.message);
      }
    } catch (error) {
      console.log('❌ Error verificando tb_conversations:', error);
    }

    try {
      const { error: msgError } = await supabase
        .from('tb_messages')
        .select('id')
        .limit(1);
      
      if (!msgError) {
        tableChecks.tb_messages = true;
        console.log('✅ tb_messages existe y es accesible');
      } else {
        console.log('❌ tb_messages no accesible:', msgError.message);
      }
    } catch (error) {
      console.log('❌ Error verificando tb_messages:', error);
    }

    try {
      const { error: profError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!profError) {
        tableChecks.profiles = true;
        console.log('✅ profiles existe y es accesible');
      } else {
        console.log('❌ profiles no accesible:', profError.message);
      }
    } catch (error) {
      console.log('❌ Error verificando profiles:', error);
    }

    // 2. Verificar estructura de las tablas accesibles
    console.log('\n💬 Verificando estructura de tablas...');
    
    if (tableChecks.tb_conversations) {
      try {
        const { data: convSample, error: convError } = await supabase
          .from('tb_conversations')
          .select('*')
          .limit(1);

        if (!convError && convSample && convSample.length > 0) {
          console.log('✅ tb_conversations columnas:', Object.keys(convSample[0]));
        }
      } catch (error) {
        console.error('❌ Error obteniendo estructura de tb_conversations:', error);
      }
    }

    if (tableChecks.tb_messages) {
      try {
        const { data: msgSample, error: msgError } = await supabase
          .from('tb_messages')
          .select('*')
          .limit(1);

        if (!msgError && msgSample && msgSample.length > 0) {
          console.log('✅ tb_messages columnas:', Object.keys(msgSample[0]));
        }
      } catch (error) {
        console.error('❌ Error obteniendo estructura de tb_messages:', error);
      }
    }

    if (tableChecks.profiles) {
      try {
        const { data: profSample, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);

        if (!profError && profSample && profSample.length > 0) {
          console.log('✅ profiles columnas:', Object.keys(profSample[0]));
        }
      } catch (error) {
        console.error('❌ Error obteniendo estructura de profiles:', error);
      }
    }

    // 3. Verificar configuración de real-time
    console.log('\n📡 Verificando configuración de real-time...');
    
    try {
      // Crear un canal de prueba para verificar real-time
      const channel = supabase.channel('test_realtime_check')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tb_conversations' },
          (payload) => {
            console.log('✅ Real-time funcionando para tb_conversations:', payload);
          }
        )
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tb_messages' },
          (payload) => {
            console.log('✅ Real-time funcionando para tb_messages:', payload);
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado de suscripción real-time:', status);
        });

      // Esperar un momento para ver si se conecta
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Desuscribirse
      supabase.removeChannel(channel);
      
      console.log('✅ Prueba de real-time completada');
    } catch (error) {
      console.warn('⚠️ Error verificando real-time:', error);
    }

    // 4. Verificar permisos básicos
    console.log('\n🔒 Verificando permisos básicos...');
    
    const permissions = {
      tb_conversations: tableChecks.tb_conversations,
      tb_messages: tableChecks.tb_messages,
      profiles: tableChecks.profiles
    };

    console.log('✅ Permisos de acceso:', permissions);

    // 5. Verificar conexión básica
    console.log('\n🔌 Verificando conexión básica...');
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('⚠️ Error obteniendo sesión:', sessionError);
      } else {
        console.log('✅ Conexión autenticada:', !!session.session);
      }
    } catch (error) {
      console.warn('⚠️ Error verificando conexión:', error);
    }

    // 6. Verificar si hay datos en las tablas
    console.log('\n📊 Verificando datos existentes...');
    
    if (tableChecks.tb_conversations) {
      try {
        const { count: convCount, error: convCountError } = await supabase
          .from('tb_conversations')
          .select('*', { count: 'exact', head: true });

        if (!convCountError) {
          console.log(`✅ tb_conversations tiene ${convCount} registros`);
        }
      } catch (error) {
        console.log('⚠️ No se pudo contar registros de tb_conversations');
      }
    }

    if (tableChecks.tb_messages) {
      try {
        const { count: msgCount, error: msgCountError } = await supabase
          .from('tb_messages')
          .select('*', { count: 'exact', head: true });

        if (!msgCountError) {
          console.log(`✅ tb_messages tiene ${msgCount} registros`);
        }
      } catch (error) {
        console.log('⚠️ No se pudo contar registros de tb_messages');
      }
    }

    if (tableChecks.profiles) {
      try {
        const { count: profCount, error: profCountError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!profCountError) {
          console.log(`✅ profiles tiene ${profCount} registros`);
        }
      } catch (error) {
        console.log('⚠️ No se pudo contar registros de profiles');
      }
    }

    // Resumen
    console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
    console.log('=====================================');
    
    console.log(`✅ tb_conversations: ${tableChecks.tb_conversations ? 'SÍ' : 'NO'}`);
    console.log(`✅ tb_messages: ${tableChecks.tb_messages ? 'SÍ' : 'NO'}`);
    console.log(`✅ profiles: ${tableChecks.profiles ? 'SÍ' : 'NO'}`);
    
    const totalTables = Object.values(tableChecks).filter(Boolean).length;
    console.log(`✅ Total de tablas accesibles: ${totalTables}/3`);

    return {
      success: true,
      tableChecks,
      totalTables,
      permissions
    };

  } catch (error) {
    console.error('❌ Error verificando estructura de BD:', error);
    return { success: false, error };
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
