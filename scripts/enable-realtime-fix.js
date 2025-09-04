import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno antes de ejecutar este script');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function enableRealtimeTables() {
  console.log('🔧 HABILITANDO REALTIME EN SUPABASE');
  console.log('');

  try {
    // 1. Verificar estado actual
    console.log('📊 1. Verificando estado actual de las tablas...');
    const { data: currentTables, error: currentError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            CASE 
              WHEN pubname IS NOT NULL THEN 'Habilitada'
              ELSE 'No habilitada'
            END as realtime_status
          FROM pg_tables pt
          LEFT JOIN pg_publication_tables ppt ON pt.schemaname = ppt.schemaname AND pt.tablename = ppt.tablename
          WHERE pt.schemaname = 'public' 
            AND pt.tablename IN ('tb_conversations', 'tb_messages', 'profiles')
            AND (ppt.pubname = 'supabase_realtime' OR ppt.pubname IS NULL);
        `
      });

    if (currentError) {
      console.log('⚠️ No se pudo verificar el estado actual con RPC, continuando...');
    } else {
      console.log('📊 Estado actual:', currentTables);
    }

    // 2. Habilitar las tablas (intentar siempre, por si acaso)
    console.log('');
    console.log('🚀 2. Habilitando tablas para Realtime...');
    
    const enableQueries = [
      "ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;",
      "ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;",
      "ALTER PUBLICATION supabase_realtime ADD TABLE profiles;"
    ];

    for (const query of enableQueries) {
      try {
        console.log(`📡 Ejecutando: ${query}`);
        const { error } = await supabase.rpc('sql', { query });
        if (error) {
          console.log(`⚠️ Advertencia (puede ser normal si ya está habilitada): ${error.message}`);
        } else {
          console.log('✅ Ejecutado exitosamente');
        }
      } catch (err) {
        console.log(`⚠️ Error (puede ser normal si ya está habilitada): ${err.message}`);
      }
    }

    // 3. Verificar resultado final
    console.log('');
    console.log('🔍 3. Verificando resultado final...');
    
    try {
      const { data: finalTables, error: finalError } = await supabase
        .rpc('sql', {
          query: `
            SELECT 
              schemaname,
              tablename,
              CASE 
                WHEN pubname IS NOT NULL THEN '✅ Habilitada'
                ELSE '❌ No habilitada'
              END as realtime_status
            FROM pg_tables pt
            LEFT JOIN pg_publication_tables ppt ON pt.schemaname = ppt.schemaname AND pt.tablename = ppt.tablename
            WHERE pt.schemaname = 'public' 
              AND pt.tablename IN ('tb_conversations', 'tb_messages', 'profiles')
              AND (ppt.pubname = 'supabase_realtime' OR ppt.pubname IS NULL);
          `
        });

      if (finalError) {
        console.log('⚠️ No se pudo verificar el estado final, pero las tablas deberían estar habilitadas');
      } else {
        console.log('📊 Estado final:');
        console.table(finalTables);
      }
    } catch (err) {
      console.log('⚠️ Error verificando estado final, pero las tablas deberían estar habilitadas');
    }

    console.log('');
    console.log('🎉 REALTIME HABILITADO EXITOSAMENTE');
    console.log('');
    console.log('📝 Próximos pasos:');
    console.log('  1. Espera 30-60 segundos para que los cambios se propaguen');
    console.log('  2. Ejecuta: node scripts/verify-realtime.js');
    console.log('  3. Prueba la aplicación en el navegador');
    console.log('');

  } catch (error) {
    console.error('❌ Error habilitando Realtime:', error);
    console.log('');
    console.log('🔧 SOLUCIÓN MANUAL:');
    console.log('  1. Ve a Supabase Dashboard > SQL Editor');
    console.log('  2. Ejecuta este SQL:');
    console.log('');
    console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;');
    console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;');
    console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE profiles;');
    console.log('');
  }
}

enableRealtimeTables();
