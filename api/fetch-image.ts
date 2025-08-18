import type { VercelRequest, VercelResponse } from '@vercel/node'

const DEFAULT_DEV_IMAGE_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhM2FiNWI2NS1hNDVmLTQ3YjYtYjMxYy1jZDFjYWRkMjA4MDciLCJ1bmlxdWVfbmFtZSI6InNhbG9tb25AYXp0ZWNsYWIuY28iLCJuYW1laWQiOiJzYWxvbW9uQGF6dGVjbGFiLmNvIiwiZW1haWwiOiJzYWxvbW9uQGF6dGVjbGFiLmNvIiwiYXV0aF90aW1lIjoiMDgvMTcvMjAyNSAxNToxNzoyNyIsImRiX25hbWUiOiJ3YXRpX2FwcF90cmlhbCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6WyJUUklBTCIsIlRSSUFMUEFJRCJdLCJleHAiOjI1MzQwMjMwMDgwMCwiaXNzIjoiQ2xhcmVfQUkiLCJhdWQiOiJDbGFyZV9BSSJ9.uUnPZPDWIi8goZuRT9MFGl_S5V9LRS5CBNrAgIBBBLg'
const DEFAULT_PROD_IMAGE_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiZTdhZWQ5OC0yMzdmLTQ3NGUtYjVlMy0wNDU1OTEzNWJiNTQiLCJ1bmlxdWVfbmFtZSI6InNhbG9tb24rdHJ1ZWJsdWVAYXp0ZWNsYWIuY28iLCJuYW1laWQiOiJzYWxvbW9uK3RydWVibHVlQGF6dGVjbGFiLmNvIiwiZW1haWwiOiJzYWxvbW9uK3RydWVibHVlQGF6dGVjbGFiLmNvIiwiYXV0aF90aW1lIjoiMDgvMTcvMjAyNSAxMzoyODo1MyIsInRlbmFudF9pZCI6IjQ4MzU3MCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.dHQrUW2fFUD69mqiQfRd_nWnGZv6ClwujrRzkCRVd7E'

function selectToken() {
  // Preferir variable de entorno server-side si existe
  const envToken = process.env.IMAGE_AUTH_TOKEN || process.env.VITE_IMAGE_AUTH_TOKEN
  if (envToken) return envToken
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV
  // preview/prod usan el token "prod", dev el token de desarrollo
  if (env === 'development') return DEFAULT_DEV_IMAGE_TOKEN
  // Vercel: 'preview' para ramas (staging), 'production' para prod
  return DEFAULT_PROD_IMAGE_TOKEN
}

const ALLOWED_HOSTS = (process.env.ALLOWED_IMAGE_HOSTS || 'wati.io,live-mt-server.wati.io').split(',').map(h => h.trim())

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS básico para GET
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const targetUrl = (req.query.url as string) || ''
  try {
    if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' })
    const url = new URL(targetUrl)
    if (!/^https?:$/.test(url.protocol)) return res.status(400).json({ error: 'Invalid protocol' })
    if (!ALLOWED_HOSTS.some(h => url.hostname.endsWith(h))) {
      return res.status(400).json({ error: 'Host not allowed' })
    }

    const token = selectToken()
    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: token,
        Accept: 'image/*'
      }
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return res.status(upstream.status).json({ error: 'Upstream error', status: upstream.status, body: text })
    }

    const ct = upstream.headers.get('content-type') || 'application/octet-stream'
    const ab = await upstream.arrayBuffer()
    res.setHeader('Content-Type', ct)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(Buffer.from(ab))
  } catch (e: any) {
    console.error('❌ [api/fetch-image] Error:', e?.message || e)
    return res.status(500).json({ error: 'Internal error', message: e?.message || 'unknown' })
  }
}
