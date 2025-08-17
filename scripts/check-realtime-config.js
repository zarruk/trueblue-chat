#!/usr/bin/env node

// Script para verificar configuración de Realtime
// Uso: node scripts/check-realtime-config.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de Realtime...\n');

// 1. Verificar archivos de entorno
const envFiles = ['.env', '.env.local', '.env.development'];
let foundEnvFile = false;

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Archivo de entorno encontrado: ${file}`);
    foundEnvFile = true;
    
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    const supabaseUrl = lines.find(line => line.startsWith('VITE_SUPABASE_URL='));
    const supabaseKey = lines.find(line => line.startsWith('VITE_SUPABASE_ANON_KEY='));
    
    if (supabaseUrl) {
      console.log(`   📍 URL: ${supabaseUrl.split('=')[1]?.substring(0, 50)}...`);
    } else {
      console.log('   ❌ VITE_SUPABASE_URL no encontrado');
    }
    
    if (supabaseKey) {
      console.log(`   🔑 Key: ${supabaseKey.split('=')[1]?.substring(0, 20)}...`);
    } else {
      console.log('   ❌ VITE_SUPABASE_ANON_KEY no encontrado');
    }
    
    console.log('');
  }
});

if (!foundEnvFile) {
  console.log('❌ No se encontraron archivos de entorno (.env, .env.local, .env.development)');
  console.log('   Necesitas crear un archivo .env con las credenciales de Supabase\n');
}

// 2. Verificar package.json
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const devScript = packageJson.scripts?.dev;
  
  console.log('📦 Configuración de package.json:');
  console.log(`   🚀 Script dev: ${devScript}`);
  
  // Extraer puerto del script
  const portMatch = devScript?.match(/--port\s+(\d+)/);
  if (portMatch) {
    console.log(`   🌐 Puerto configurado: ${portMatch[1]}`);
  }
  
  // Verificar dependencias importantes
  const deps = packageJson.dependencies;
  if (deps['@supabase/supabase-js']) {
    console.log(`   ✅ Supabase JS: ${deps['@supabase/supabase-js']}`);
  } else {
    console.log('   ❌ @supabase/supabase-js no encontrado en dependencias');
  }
  
  console.log('');
}

// 3. Verificar archivos clave
const keyFiles = [
  'src/integrations/supabase/client.ts',
  'src/hooks/useConversations.tsx',
  'src/hooks/useRealtimeConversations.tsx',
  'src/utils/realtimeDebug.ts'
];

console.log('📁 Verificando archivos clave:');
keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NO ENCONTRADO`);
  }
});

console.log('');

// 4. Verificar scripts SQL
const sqlFiles = [
  'database.sql',
  'scripts/enable-realtime.sql',
  'scripts/verify-realtime.sql'
];

console.log('📄 Scripts SQL disponibles:');
sqlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - NO ENCONTRADO`);
  }
});

console.log('');

// 5. Instrucciones
console.log('🚀 SIGUIENTES PASOS:');
console.log('');
console.log('1. 📡 Verificar Supabase Realtime:');
console.log('   - Ve a tu proyecto Supabase');
console.log('   - Abre la consola SQL');
console.log('   - Ejecuta: scripts/verify-realtime.sql');
console.log('');
console.log('2. 🌐 Iniciar aplicación:');
console.log('   - npm run dev:debug    (puerto 3000 + debug)');
console.log('   - npm run dev:port8080 (puerto 8080)');
console.log('   - npm run dev:port3001 (puerto 3001)');
console.log('');
console.log('3. 🔧 Debug en aplicación:');
console.log('   - Abre la aplicación en 2 ventanas diferentes');
console.log('   - Usa el botón "Debug Realtime" (esquina inferior derecha)');
console.log('   - Ejecuta "Diagnóstico Completo"');
console.log('');
console.log('4. 📊 Verificar logs:');
console.log('   - Abre DevTools (F12)');
console.log('   - Ve a la pestaña Console');
console.log('   - Busca logs con 🔌 (Realtime) y 📡 (conexión)');
console.log('');

if (!foundEnvFile) {
  console.log('⚠️  IMPORTANTE: Crear archivo .env con:');
  console.log('   VITE_SUPABASE_URL=tu_url_de_supabase');
  console.log('   VITE_SUPABASE_ANON_KEY=tu_clave_anonima');
  console.log('');
}

console.log('✅ Verificación completada. ¡Buena suerte!');
