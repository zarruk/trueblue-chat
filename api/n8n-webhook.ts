import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Manejar OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Resolver la URL del webhook de n8n desde variables de entorno
    // Preferir N8N_WEBHOOK_URL; como alternativa, aceptar VITE_N8N_WEBHOOK_URL si está definida en Vercel
    let webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL

    // Si no está configurada, retornar error explícito (evitar endpoints genéricos que no existen)
    if (!webhookUrl) {
      console.error('❌ N8N_WEBHOOK_URL no está configurada. Configura N8N_WEBHOOK_URL (o VITE_N8N_WEBHOOK_URL) en Vercel con la Production URL del workflow activo.')
      return res.status(500).json({
        error: 'Missing configuration',
        message: 'N8N_WEBHOOK_URL no está configurada. Define la Production URL del workflow activo en las variables de entorno.'
      })
    }
    
    console.log('🔄 Proxy n8n webhook:', {
      url: webhookUrl,
      body: req.body,
      method: req.method,
      env: {
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? 'SET' : 'NOT SET',
        VITE_N8N_WEBHOOK_URL: process.env.VITE_N8N_WEBHOOK_URL ? 'SET' : 'NOT SET'
      }
    })

    // Usar el módulo https nativo para evitar problemas con fetch
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
        
        response.on('data', (chunk) => {
          data += chunk
        })
        
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data)
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${data}`))
          }
        })
      })
      
      request.on('error', reject)
      request.write(postData)
      request.end()
    })

    console.log('📡 Respuesta de n8n:', responseData)

    // Intentar parsear como JSON, si falla devolver el texto
    try {
      const data = JSON.parse(responseData)
      return res.status(200).json(data)
    } catch {
      return res.status(200).send(responseData)
    }
    
  } catch (error) {
    console.error('❌ Error en proxy n8n:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}