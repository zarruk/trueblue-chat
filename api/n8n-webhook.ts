import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Obtener la URL del webhook de n8n desde las variables de entorno
    const webhookUrl = process.env.VITE_N8N_WEBHOOK_URL || 'https://aztec.app.n8n.cloud/webhook/tb_local'
    
    console.log('🔄 Proxy n8n webhook:', {
      url: webhookUrl,
      body: req.body,
      method: req.method
    })

    // Hacer la petición a n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const responseText = await response.text()
    
    console.log('📡 Respuesta de n8n:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    })

    // Si la respuesta no es OK, devolver el error
    if (!response.ok) {
      return res.status(response.status).json({
        error: `n8n webhook error: ${response.statusText}`,
        details: responseText
      })
    }

    // Intentar parsear como JSON, si falla devolver el texto
    try {
      const data = JSON.parse(responseText)
      return res.status(200).json(data)
    } catch {
      return res.status(200).send(responseText)
    }
    
  } catch (error) {
    console.error('❌ Error en proxy n8n:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
