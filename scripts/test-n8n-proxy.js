// Script para probar el proxy de n8n

const TEST_URL = 'http://localhost:3000/api/n8n-webhook'

const testPayload = {
  conversationId: 'test-conversation-proxy',
  message: 'Mensaje de prueba a través del proxy',
  channel: 'telegram',
  senderId: 'test-agent-proxy',
  chatId: 'test-user-proxy'
}

console.log('🧪 Probando proxy de n8n...')
console.log('URL:', TEST_URL)
console.log('Payload:', testPayload)

try {
  const response = await fetch(TEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPayload),
  })

  console.log('📡 Respuesta del proxy:')
  console.log('Status:', response.status)
  console.log('Status Text:', response.statusText)

  const text = await response.text()
  console.log('Body:', text)

  if (response.ok) {
    console.log('✅ Proxy funcionando correctamente')
  } else {
    console.log('❌ Error en el proxy')
  }
} catch (error) {
  console.error('❌ Error:', error.message)
}
