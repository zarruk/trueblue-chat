import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { n8nService } from '@/services/n8nService'
// Notificaciones deshabilitadas en toda la app
const toast = { success: (..._args: any[]) => {}, error: (..._args: any[]) => {}, info: (..._args: any[]) => {} } as const

export function N8nWebhookDebug() {
  const [testData, setTestData] = useState({
    conversationId: 'test-conversation-123',
    message: 'Este es un mensaje de prueba para verificar el webhook de n8n',
    channel: 'telegram',
    senderId: 'test-agent-456',
    chatId: 'test-user-789'
  })
  
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)

  const handleTestWebhook = async () => {
    setLoading(true)
    setResponse(null)
    
    try {
      console.log('🧪 Probando webhook de n8n con datos:', testData)
      
      const result = await n8nService.sendMessageToWebhook(testData)
      
      setResponse(result)
      
      if (result.success) {
        toast.success('✅ Webhook probado exitosamente')
      } else {
        toast.error(`❌ Error en webhook: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ Error probando webhook:', error)
      toast.error('Error al probar el webhook')
      setResponse({ success: false, error: error instanceof Error ? error.message : 'Error desconocido' })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setTestData({
      conversationId: 'test-conversation-123',
      message: 'Este es un mensaje de prueba para verificar el webhook de n8n',
      channel: 'telegram',
      senderId: 'test-agent-456',
      chatId: 'test-user-789'
    })
    setResponse(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Debug del Webhook de n8n</CardTitle>
          <CardDescription>
            Prueba el webhook de n8n directamente con datos personalizados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conversationId">ID de Conversación</Label>
              <Input
                id="conversationId"
                value={testData.conversationId}
                onChange={(e) => setTestData(prev => ({ ...prev, conversationId: e.target.value }))}
                placeholder="test-conversation-123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Input
                id="channel"
                value={testData.channel}
                onChange={(e) => setTestData(prev => ({ ...prev, channel: e.target.value }))}
                placeholder="telegram"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderId">ID del Agente</Label>
              <Input
                id="senderId"
                value={testData.senderId}
                onChange={(e) => setTestData(prev => ({ ...prev, senderId: e.target.value }))}
                placeholder="test-agent-456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatId">ID del Chat</Label>
              <Input
                id="chatId"
                value={testData.chatId}
                onChange={(e) => setTestData(prev => ({ ...prev, chatId: e.target.value }))}
                placeholder="test-user-789"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              value={testData.message}
              onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Escribe tu mensaje de prueba aquí..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleTestWebhook} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? '🔄 Probando...' : '🚀 Probar Webhook'}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={loading}
            >
              🔄 Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>📡 Respuesta del Webhook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🔍 Información del Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Endpoint (frontend → proxy):</strong> /api/n8n-webhook</div>
          <div><strong>VITE_N8N_WEBHOOK_URL (cliente):</strong> {import.meta.env.VITE_N8N_WEBHOOK_URL || 'No definida'}</div>
          <div><strong>N8N_WEBHOOK_URL (server):</strong> Definida en Vercel (no visible en el navegador)</div>
          <div><strong>Método:</strong> POST</div>
          <div><strong>Content-Type:</strong> application/json</div>
          <div><strong>Estructura del Payload:</strong></div>
          <div className="bg-muted p-2 rounded text-xs">
            <pre>{JSON.stringify({
              conversationId: "string",
              message: "string", 
              channel: "string",
              senderId: "string",
              chatId: "string"
            }, null, 2)}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
