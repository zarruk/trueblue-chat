const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando TrueBlue Chat Management...');
console.log('📁 Directorio:', process.cwd());
console.log('🔧 Puerto:', 5173);

const vite = spawn('npx', ['vite', '--port', '5173'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

vite.on('error', (error) => {
  console.error('❌ Error al iniciar Vite:', error.message);
  process.exit(1);
});

vite.on('close', (code) => {
  console.log(`\n🔚 Vite se cerró con código: ${code}`);
  process.exit(code);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...');
  vite.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor...');
  vite.kill('SIGTERM');
});
