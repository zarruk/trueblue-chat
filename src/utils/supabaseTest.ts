import { supabase } from '@/integrations/supabase/client';

export async function testSupabaseConnection() {
  try {
    console.log('🔌 Probando conexión a Supabase...');
    
    // Intentar obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError);
      return { success: false, error: sessionError };
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    console.log('📊 Estado de sesión:', session ? 'Usuario autenticado' : 'Usuario no autenticado');
    
    // Intentar hacer una consulta simple a la base de datos
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.warn('⚠️ No se pudo acceder a la tabla profiles:', testError.message);
      console.log('💡 Esto puede ser normal si la tabla no existe aún');
    } else {
      console.log('✅ Acceso a base de datos exitoso');
    }
    
    return { success: true, session, testData };
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return { success: false, error };
  }
}





