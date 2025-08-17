import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nenlqfmkclpmaiosdefx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbmxxZm1rY2xwbWFpb3NkZWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjcwNjMsImV4cCI6MjA3MDg0MzA2M30.bDszNEOuE9lYysInmUbCBjTYgI7IsSkHL37kK7ou6Bo'

const EMAIL = process.env.TEST_EMAIL || 'salomon@azteclab.co'
const REDIRECT = process.env.TEST_REDIRECT || 'https://staging.trueblue.azteclab.co/'

async function main() {
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
