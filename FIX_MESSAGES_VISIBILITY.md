# Solución: No se ven los mensajes del usuario

## Problema identificado

El problema de que no se ven los mensajes del usuario se debe a varios factores:

1. **Columna faltante**: La tabla `tb_messages` podría no tener la columna `client_id` que el código espera
2. **Conexión Realtime fallando**: La conexión en tiempo real está experimentando timeouts
3. **Políticas RLS restrictivas**: Las políticas de seguridad pueden estar bloqueando el acceso a los mensajes

## Solución paso a paso

### 1. Ejecutar el script de corrección en Supabase

Ve al SQL Editor de Supabase y ejecuta el siguiente script:

```bash
# El script está en:
scripts/fix-messages-visibility.sql
```

Este script:
- Agrega la columna `client_id` a `tb_messages` si no existe
- Asigna el `client_id` correcto a todos los mensajes basándose en su conversación
- Actualiza las políticas RLS para ser más permisivas
- Configura las tablas para Realtime

### 2. Verificar tu usuario

Asegúrate de que tu usuario tenga un `client_id` asignado. Ejecuta en Supabase:

```sql
SELECT id, email, role, client_id 
FROM profiles 
WHERE email = 'tu-email@ejemplo.com';
```

Si `client_id` es NULL, asígnale el cliente por defecto:

```sql
UPDATE profiles 
SET client_id = '550e8400-e29b-41d4-a716-446655440000' -- Trueblue por defecto
WHERE email = 'tu-email@ejemplo.com';
```

### 3. Reiniciar la aplicación

Después de ejecutar los scripts:

1. Detén el servidor local (Ctrl+C)
2. Vuelve a iniciarlo:
   ```bash
   npm run dev
   ```

### 4. Verificar en el navegador

1. Abre la aplicación en http://localhost:3000
2. Abre la consola del navegador (F12)
3. Intenta enviar un mensaje
4. Revisa si aparecen errores en la consola

### 5. Si el problema persiste

Si aún no ves los mensajes:

#### Verificar Realtime en Supabase Dashboard:

1. Ve a tu proyecto en Supabase
2. Ve a Database → Replication
3. Asegúrate de que estas tablas estén habilitadas para Realtime:
   - `tb_conversations`
   - `tb_messages`
   - `profiles`

#### Ejecutar diagnóstico adicional:

```bash
# En la terminal del proyecto
npm run test:realtime
```

#### Revisar logs en tiempo real:

1. En la aplicación, busca el botón de debug en la esquina inferior derecha
2. Actívalo para ver logs de Realtime en tiempo real

## Solución alternativa temporal

Si necesitas trabajar mientras se soluciona el Realtime, puedes:

1. Refrescar manualmente la página después de enviar un mensaje
2. Los mensajes deberían aparecer después del refresh

## Verificación final

Para confirmar que todo funciona:

1. Crea una nueva conversación
2. Envía un mensaje
3. El mensaje debería aparecer inmediatamente
4. Si tienes otra ventana abierta con la misma conversación, el mensaje debería aparecer ahí también

## Contacto para soporte

Si el problema persiste después de seguir estos pasos:

1. Verifica los logs del navegador
2. Ejecuta `npm run diagnose` y comparte el resultado
3. Revisa que tu archivo `.env.local` tenga las credenciales correctas de Supabase

