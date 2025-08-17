// Servicio para la integración con n8n
export interface N8nWebhookPayload {
  conversationId: string
  message: string
  channel: string
  senderId: string
  chatId: string
}

export interface N8nWebhookResponse {
  success: boolean
  message?: string
  data?: any
  error?: string
}

class N8nService {
  private webhookUrl = (() => {
    const envUrl = import.meta.env.VITE_N8N_WEBHOOK_URL
    const isLocalhost = typeof window !== 'undefined' && /^(https?:\/\/)(localhost|127\.0\.0\.1)/.test(window.location.origin)

    // En local, forzar siempre el proxy para evitar CORS desde el navegador
    if (isLocalhost) {
      return '/n8n-webhook'
    }

    // En desarrollo, si no hay variable, usar el proxy local
    if (import.meta.env.DEV && !envUrl) {
      return '/n8n-webhook'
    }

    // En otros casos, usar la URL de entorno o el fallback de pruebas correcto
    return envUrl || 'https://aztec.app.n8n.cloud/webhook/tb_local'
  })()

  /**
   * Envía un mensaje al webhook de n8n para que sea procesado y enrutado
   */
  async sendMessageToWebhook(payload: N8nWebhookPayload): Promise<N8nWebhookResponse> {
    try {
      console.log('🚀 Enviando mensaje a n8n webhook:', {
        url: this.webhookUrl,
        payload: {
          ...payload,
          message: payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : '')
        }
      })
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('📡 Respuesta del servidor n8n:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error HTTP del webhook n8n:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Respuesta exitosa del webhook n8n:', result)

      return {
        success: true,
        data: result,
        message: 'Mensaje enviado exitosamente a n8n'
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje a n8n:', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        payload: {
          ...payload,
          message: payload.message.substring(0, 100) + (payload.message.length > 100 ? '...' : '')
        }
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        message: 'Error al enviar mensaje a n8n'
      }
    }
  }

  /**
   * Determina el canal basado en la información de la conversación
   */
  detectChannel(conversation: any): string {
    // Si ya hay un canal definido en la base de datos, usarlo
    if (conversation.channel && conversation.channel !== 'web') {
      return conversation.channel
    }
    
    // Si hay phone_number, probablemente sea WhatsApp o SMS
    if (conversation.phone_number) {
      // Puedes agregar lógica adicional para distinguir entre WhatsApp y SMS
      // Por ejemplo, basándose en el formato del número
      if (conversation.phone_number.includes('@c.us')) {
        return 'whatsapp'
      }
      return 'sms'
    }
    
    // Si hay username con @, probablemente sea Telegram
    if (conversation.username && conversation.username.startsWith('@')) {
      return 'telegram'
    }
    
    // Por defecto, asumimos que es web
    return 'web'
  }

  /**
   * Prepara el payload para el webhook de n8n
   */
  prepareWebhookPayload(
    conversationId: string,
    conversation: any,
    messageContent: string,
    agentId: string, // Cambiar de agentEmail a agentId
    agentName: string
  ): N8nWebhookPayload {
    const channel = this.detectChannel(conversation)
    
    // El chatId debe ser el user_id de la conversación (identificador del usuario en el canal de origen)
    const chatId = conversation.user_id
    
    // El senderId debe ser el ID del agente que está enviando el mensaje
    const senderId = agentId
    
    console.log('🔍 Preparando payload para n8n:', {
      conversationId,
      messageContent: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
      channel,
      senderId,
      chatId,
      conversationData: conversation
    })
    
    return {
      conversationId: conversationId,
      message: messageContent,
      channel: channel,
      senderId: senderId,
      chatId: chatId
    }
  }
}

export const n8nService = new N8nService()
