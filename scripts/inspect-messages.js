import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadEnvFromDotEnvLocal() {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) return {}
    const content = fs.readFileSync(envPath, 'utf-8')
    const lines = content.split(/\r?\n/)
    const env = {}
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      let value = m[2]
      // Remove optional surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
    return env
  } catch {
    return {}
  }
}

const localEnv = loadEnvFromDotEnvLocal()
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan SUPABASE_URL/SUPABASE_ANON_KEY (intenta definir VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY en .env.local)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function main() {
  console.log('🔎 Inspeccionando tb_messages por rol...')

  const { data: rows, error: rowsError } = await supabase
    .from('tb_messages')
    .select('sender_role')

  if (rowsError) {
    console.error('❌ Error obteniendo mensajes para conteo:', rowsError.message)
  } else {
    const counts = rows?.reduce((acc, r) => {
      acc[r.sender_role] = (acc[r.sender_role] || 0) + 1
      return acc
    }, {}) || {}
    console.log('📊 Conteo por rol:', counts)
  }

  const { data: lastUser, error: userErr } = await supabase
    .from('tb_messages')
    .select('id, conversation_id, content, created_at')
    .eq('sender_role', 'user')
    .order('created_at', { ascending: false })
    .limit(5)

  if (userErr) {
    console.error('❌ Error listando mensajes user:', userErr.message)
  } else {
    console.log('🧾 Últimos mensajes user:', lastUser)
  }

  const { data: lastAgent, error: agentErr } = await supabase
    .from('tb_messages')
    .select('id, conversation_id, content, created_at')
    .eq('sender_role', 'agent')
    .order('created_at', { ascending: false })
    .limit(5)

  if (agentErr) {
    console.error('❌ Error listando mensajes agent:', agentErr.message)
  } else {
    console.log('🧾 Últimos mensajes agent:', lastAgent)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })


