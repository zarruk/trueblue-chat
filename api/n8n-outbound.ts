import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // URL dedicada para OUTBOUND (iniciar conversación)
    const webhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL || process.env.VITE_N8N_OUTBOUND_WEBHOOK_URL
    if (!webhookUrl) {
      console.error('❌ N8N_OUTBOUND_WEBHOOK_URL no está configurada.')
      return res.status(500).json({ error: 'Missing configuration', message: 'Define N8N_OUTBOUND_WEBHOOK_URL en Vercel.' })
    }

    const https = await import('https')
    const url = new URL(webhookUrl)

    const responseData = await new Promise<string>((resolve, reject) => {
      const postData = JSON.stringify(req.body)
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }
      const request = https.request(options, (response) => {
        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) resolve(data)
          else reject(new Error(`HTTP ${response.statusCode}: ${data}`))
        })
      })
      request.on('error', reject)
      request.write(postData)
      request.end()
    })

    try {
      const json = JSON.parse(responseData)
      return res.status(200).json(json)
    } catch {
      return res.status(200).send(responseData)
    }
  } catch (error) {
    console.error('❌ Error en proxy n8n OUTBOUND:', error)
    return res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}


