import WebSocket from 'ws';

async function testWebSocketConnection() {
  console.log('🔌 Probando conexión WebSocket directa a Supabase Realtime...\n');
  
  const wsUrl = 'wss://avkpygwhymnxotwqzknz.supabase.co/realtime/v1/websocket';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2a3B5Z3doeW1ueG90d3F6a256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjEyMDcsImV4cCI6MjA2ODg5NzIwN30.p97K1S3WYNAeYb-ExRpRp3J_pqFegFJ11VOe5th_xHk';
  
  return new Promise((resolve) => {
    console.log(`📡 Conectando a: ${wsUrl}`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...`);
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey
      }
    });
    
    let connectionTimeout = setTimeout(() => {
      console.log('⏰ Timeout de conexión (10 segundos)');
      ws.close();
      resolve(false);
    }, 10000);
    
    ws.on('open', () => {
      console.log('✅ Conexión WebSocket establecida');
      clearTimeout(connectionTimeout);
      
      // Enviar mensaje de prueba
      const testMessage = {
        event: 'phx_join',
        topic: 'realtime:test',
        payload: {},
        ref: 1
      };
      
      console.log('📤 Enviando mensaje de prueba...');
      ws.send(JSON.stringify(testMessage));
      
      // Cerrar después de 5 segundos
      setTimeout(() => {
        console.log('🔒 Cerrando conexión de prueba');
        ws.close();
        resolve(true);
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Mensaje recibido:', JSON.stringify(message, null, 2));
      } catch (error) {
        console.log('📨 Mensaje recibido (raw):', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.log('❌ Error de WebSocket:', error.message);
      clearTimeout(connectionTimeout);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔒 Conexión cerrada - Código: ${code}, Razón: ${reason}`);
      clearTimeout(connectionTimeout);
    });
  });
}

async function main() {
  console.log('🧪 TEST DE CONEXIÓN WEBSOCKET DIRECTA\n');
  
  try {
    const success = await testWebSocketConnection();
    
    console.log('\n📊 RESULTADO:');
    if (success) {
      console.log('✅ WebSocket funcionando correctamente');
      console.log('💡 El problema puede estar en la configuración de Supabase Realtime');
    } else {
      console.log('❌ WebSocket no funciona');
      console.log('💡 Verificar configuración de red/firewall');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testWebSocketConnection };
