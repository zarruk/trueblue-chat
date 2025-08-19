#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Script para diagnosticar diferencias entre local y staging
console.log('🔍 DIAGNÓSTICO REALTIME - LOCAL vs STAGING')
console.log('=' .repeat(60))

// Configuración LOCAL (leer de entorno para evitar exponer claves)
const LOCAL_SUPABASE_URL = process.env.LOCAL_SUPABASE_URL
const LOCAL_SUPABASE_ANON_KEY = process.env.LOCAL_SUPABASE_ANON_KEY

// Configuración STAGING
const STAGING_SUPABASE_URL = process.env.STAGING_SUPABASE_URL
const STAGING_SUPABASE_ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY

async function testEnvironment(name, url, anonKey) {
  console.log(`\n🧪 TESTING ${name} ENVIRONMENT`)
  console.log('-'.repeat(40))
  
  try {
    // 1. Crear cliente
    const supabase = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    
    // 2. Test conexión básica
    console.log('📡 Testing basic connection...')
    const { data, error } = await supabase
      .from('tb_conversations')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log(`❌ Basic connection failed: ${error.message}`)
      return false
    }
    
    console.log('✅ Basic connection successful')
    
    // 3. Test WebSocket directo
    console.log('\n🔌 Testing WebSocket connection...')
    const wsUrl = `${url.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${anonKey}&vsn=1.0.0`
    
    const ws = new WebSocket(wsUrl)
    
    await new Promise((resolve) => {
      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        ws.close()
        resolve(true)
      }
      
      ws.onerror = (error) => {
        console.log('❌ WebSocket error:', error)
        resolve(false)
      }
      
      ws.onclose = (event) => {
        console.log(`📊 WebSocket closed: code=${event.code}, reason=${event.reason}`)
      }
      
      setTimeout(() => {
        console.log('⏱️ WebSocket timeout')
        ws.close()
        resolve(false)
      }, 5000)
    })
    
    // 4. Test Realtime channel
    console.log('\n📻 Testing Realtime channel...')
    let channelStatus = 'unknown'
    let eventReceived = false
    
    const channel = supabase
      .channel(`test-${name.toLowerCase()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tb_messages' },
        (payload) => {
          console.log('✅ Realtime event received:', payload)
          eventReceived = true
        }
      )
      .subscribe((status) => {
        console.log(`📡 Channel status: ${status}`)
        channelStatus = status
      })
    
    // Esperar estado del canal
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log(`\n📊 RESULTS FOR ${name}:`)
    console.log(`- Channel Status: ${channelStatus}`)
    console.log(`- Event Received: ${eventReceived}`)
    
    // 5. Verificar headers y CORS (simulado)
    console.log('\n🔍 Checking environment configuration...')
    const projectRef = url.match(/https:\/\/(.+?)\.supabase\.co/)?.[1]
    console.log(`- Project Ref: ${projectRef || 'unknown'}`)
    console.log(`- URL Protocol: ${url.startsWith('https://') ? 'HTTPS ✅' : 'HTTP ❌'}`)
    console.log(`- Key Length: ${anonKey.length} chars`)
    
    // Limpiar
    channel.unsubscribe()
    
    return channelStatus === 'SUBSCRIBED'
    
  } catch (error) {
    console.log(`❌ Fatal error: ${error.message}`)
    return false
  }
}

async function compareEnvironments() {
  // Test LOCAL
  if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_ANON_KEY) {
    console.log('\n⚠️ LOCAL CREDENTIALS NOT SET (skip)')
  }
  const localResult = LOCAL_SUPABASE_URL && LOCAL_SUPABASE_ANON_KEY
    ? await testEnvironment('LOCAL', LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY)
    : false
  
  // Test STAGING
  if (!STAGING_SUPABASE_URL || !STAGING_SUPABASE_ANON_KEY) {
    console.log('\n⚠️ STAGING CREDENTIALS NOT SET')
    console.log('Please set STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY')
    return
  }
  
  const stagingResult = await testEnvironment('STAGING', STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY)
  
  // Comparar resultados
  console.log('\n' + '='.repeat(60))
  console.log('📊 COMPARISON RESULTS:')
  console.log(`- LOCAL: ${localResult ? '✅ Working' : '❌ Failed'}`)
  console.log(`- STAGING: ${stagingResult ? '✅ Working' : '❌ Failed'}`)
  
  if (localResult && !stagingResult) {
    console.log('\n🔍 POSSIBLE ISSUES WITH STAGING:')
    console.log('1. Realtime not enabled for tables in staging project')
    console.log('2. RLS policies blocking realtime events')
    console.log('3. Different Supabase project configuration')
    console.log('4. CORS/Headers issues in deployment environment')
    console.log('5. Anon key permissions differ between projects')
    
    console.log('\n💡 RECOMMENDED FIXES:')
    console.log('1. Run this SQL in staging Supabase:')
    console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE tb_conversations;')
    console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE tb_messages;')
    console.log('   ALTER PUBLICATION supabase_realtime ADD TABLE profiles;')
    console.log('\n2. Check RLS policies match between local and staging')
    console.log('3. Verify anon key has same permissions in both projects')
  }
}

// Ejecutar comparación
console.log('🚀 Starting diagnostic...\n')
compareEnvironments()
  .then(() => {
    console.log('\n✅ Diagnostic complete')
    process.exit(0)
  })
  .catch(error => {
    console.log('\n❌ Diagnostic failed:', error)
    process.exit(1)
  })
