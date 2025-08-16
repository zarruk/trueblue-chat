// Script para probar configuraciones
console.log('=== DEBUGGING CONFIGURACIÓN ===');

// 1. Verificar variables de entorno
console.log('1. Variables de entorno:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_N8N_WEBHOOK_URL:', import.meta.env.VITE_N8N_WEBHOOK_URL);

// 2. Verificar conexión de Supabase
import { supabase } from './src/integrations/supabase/client.ts';

console.log('2. Verificando conexión Supabase...');
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session:', data.session?.user?.email || 'No session');
  console.log('Error:', error?.message || 'No error');
});

// 3. Probar webhook
console.log('3. URL de webhook actual:', import.meta.env.VITE_N8N_WEBHOOK_URL);

export {};
