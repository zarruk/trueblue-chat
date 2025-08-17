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
    // Obtener la URL del webhook de n8n desde las variables de entorno
    // En Vercel Functions, las variables VITE_ no están disponibles, usar N8N_WEBHOOK_URL
    // IMPORTANTE: Debes configurar N8N_WEBHOOK_URL en las variables de entorno de Vercel
    let webhookUrl = process.env.N8N_WEBHOOK_URL
    
    // Si no está configurada la variable, usar la URL correcta según el entorno
    if (!webhookUrl) {
      // Detectar el entorno basándose en VERCEL_ENV o la URL
      const isProduction = process.env.VERCEL_ENV === 'production' || 
                          (req.headers.host && req.headers.host.includes('trueblue.azteclab.co') && !req.headers.host.includes('staging'))
      
      webhookUrl = isProduction 
        ? 'https://aztec.app.n8n.cloud/webhook/production'
        : 'https://aztec.app.n8n.cloud/webhook/staging'
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