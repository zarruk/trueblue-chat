import { createClient } from '@supabase/supabase-js'

// Lee credenciales de entorno, no hardcodear
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const EMAIL = process.env.TEST_EMAIL
const REDIRECT = process.env.TEST_REDIRECT

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Configura SUPABASE_URL y SUPABASE_ANON_KEY en el entorno para ejecutar este script')
  }
  if (!EMAIL || !REDIRECT) {
    throw new Error('Configura TEST_EMAIL y TEST_REDIRECT en el entorno para ejecutar este script')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  console.log('→ Enviando magic link a', EMAIL, 'redirect:', REDIRECT)
  const { data, error } = await supabase.auth.signInWithOtp({
    email: EMAIL,
    options: {
      emailRedirectTo: REDIRECT,
    }
  })
  console.log('data:', data)
  console.log('error:', error)
}

main().catch(err => { console.error(err); process.exit(1) })
