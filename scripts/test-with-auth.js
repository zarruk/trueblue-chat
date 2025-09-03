import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan SUPABASE_URL/SUPABASE_ANON_KEY (o VITE_*) en el entorno')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('🔐 TEST CON AUTENTICACIÓN - VERIFICAR RLS')
console.log('=' * 50)

async function testWithAuth() {
  try {
    console.log('\n1. 🔍 Verificando sesión actual...')
    const { data: session } = await supabase.auth.getSession()
    console.log('👤 Sesión actual:', session.session ? '✅ Autenticado' : '❌ No autenticado')
    
    if (session.session) {
      console.log('📧 Email:', session.session.user.email)
      console.log('🔑 Role:', session.session.user.role)
    }

    console.log('\n2. 🔍 Verificando perfil de usuario...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single()
    
    if (profileError) {
      console.log('❌ Error obteniendo perfil:', profileError.message)
      console.log('💡 Esto indica problema de RLS o falta de datos')
    } else {
      console.log('✅ Perfil obtenido:', {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role
      })
    }

    console.log('\n3. 🔍 Verificando conversaciones...')
    const { data: conversations, error: convError } = await supabase
      .from('tb_conversations')
      .select('*')
      .limit(1)
    
    if (convError) {
      console.log('❌ Error obteniendo conversaciones:', convError.message)
      return
    }
    
    console.log('✅ Conversaciones obtenidas:', conversations.length)
    
    if (!conversations || conversations.length === 0) {
      console.log('❌ No hay conversaciones para probar')
      return
    }

    console.log('\n4. 🧪 Probando inserción de mensaje...')
    
    const testMessage = {
      conversation_id: conversations[0].id,
      content: `Test con auth ${new Date().toISOString()}`,
      sender_role: 'agent'
    }
    
    // Si tenemos perfil, agregamos datos del agente
    if (profile) {
      testMessage.agent_email = profile.email
      testMessage.agent_name = profile.name
      testMessage.responded_by_agent_id = profile.id
    }
    
    console.log('📤 Insertando mensaje:', testMessage)
    
    const { data: insertResult, error: insertError } = await supabase
      .from('tb_messages')
      .insert(testMessage)
      .select()
    
    if (insertError) {
      console.log('❌ Error insertando mensaje:', insertError.message)
      console.log('🔍 Detalles del error:', insertError)
      
      // Verificar políticas específicas
      console.log('\n🔍 Verificando políticas de RLS...')
      const { data: policies, error: policyError } = await supabase
        .rpc('pg_get_rls_status')
        .catch(() => {
          console.log('⚠️ No se puede verificar RLS via RPC')
          return { data: null, error: null }
        })
      
      if (policies) {
        console.log('📋 Políticas RLS:', policies)
      }
      
    } else {
      console.log('✅ Mensaje insertado exitosamente!')
      console.log('📊 Resultado:', insertResult)
    }

    console.log('\n5. 🧪 Probando actualización de conversación...')
    
    const { data: updateResult, error: updateError } = await supabase
      .from('tb_conversations')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', conversations[0].id)
      .select()
    
    if (updateError) {
      console.log('❌ Error actualizando conversación:', updateError.message)
    } else {
      console.log('✅ Conversación actualizada exitosamente!')
    }

    console.log('\n📊 RESUMEN:')
    console.log('=' * 30)
    console.log('👤 Autenticación:', session.session ? '✅' : '❌')
    console.log('👤 Perfil:', profile ? '✅' : '❌')
    console.log('📋 Conversaciones:', conversations.length > 0 ? '✅' : '❌')
    console.log('📨 Inserción mensajes:', insertError ? '❌' : '✅')
    console.log('🔄 Actualización conversaciones:', updateError ? '❌' : '✅')

    if (insertError) {
      console.log('\n🚨 DIAGNÓSTICO:')
      console.log('• El problema es Row Level Security (RLS)')
      console.log('• Las políticas están bloqueando las operaciones')
      console.log('• Necesitas ejecutar el script fix-rls-realtime.sql')
      console.log('• O deshabilitar RLS temporalmente para desarrollo')
    }

  } catch (error) {
    console.log('❌ Error general:', error)
  }
}

// Ejecutar test
testWithAuth()
  .then(() => {
    console.log('\n🏁 Test con autenticación completado')
    process.exit(0)
  })
  .catch(error => {
    console.log('❌ Error fatal:', error)
    process.exit(1)
  })
