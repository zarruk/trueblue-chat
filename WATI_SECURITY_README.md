# WATI Security Configuration

## 🚨 **IMPORTANTE: Seguridad de Tokens**

Este proyecto utiliza tokens de autenticación de WATI (WhatsApp API) para descargar imágenes de mensajes. **NUNCA hardcodees estos tokens en el código fuente**.

## 🔐 **Configuración de Tokens**

### 1. **Variables de Entorno Requeridas**

Agrega estas variables a tu archivo `.env`:

```bash
# WATI Development Token (para desarrollo local)
VITE_WATI_DEV_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WATI Production Token (para staging/producción)
VITE_WATI_PROD_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. **Archivos de Entorno por Ambiente**

- **`.env.local`** - Para desarrollo local (no committear)
- **`.env.staging`** - Para entorno de staging
- **`.env.production`** - Para entorno de producción

### 3. **Obtención de Tokens**

1. Ve a tu [Dashboard de WATI](https://app.wati.io/)
2. Navega a **Settings > API**
3. Copia el **Bearer Token** correspondiente
4. **NO** lo copies directamente en el código

## 🛡️ **Medidas de Seguridad Implementadas**

### ✅ **Lo que SÍ está implementado:**
- Tokens cargados desde variables de entorno
- Configuración centralizada en `src/config/wati.ts`
- Validación de configuración en tiempo de ejecución
- Logs de advertencia si los tokens no están configurados

### ❌ **Lo que NO debes hacer:**
- Hardcodear tokens en archivos `.tsx` o `.ts`
- Committear archivos `.env` con tokens reales
- Compartir tokens en repositorios públicos
- Usar tokens de producción en desarrollo

## 🔧 **Uso en el Código**

### **Antes (INCORRECTO):**
```typescript
const IMAGE_AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### **Después (CORRECTO):**
```typescript
import { getWatiAuthHeader } from '@/config/wati'

const authHeader = getWatiAuthHeader()
if (authHeader) {
  // Usar authHeader para requests
}
```

## 🚀 **Deployment**

### **Vercel:**
1. Ve a tu proyecto en Vercel
2. Navega a **Settings > Environment Variables**
3. Agrega `VITE_WATI_DEV_TOKEN` y `VITE_WATI_PROD_TOKEN`
4. Asigna los valores correspondientes

### **Otros entornos:**
- Asegúrate de que las variables de entorno estén configuradas
- Verifica que los tokens no aparezcan en logs o builds

## 🔍 **Verificación de Seguridad**

### **GitGuardian:**
- Ejecuta `npm run lint` para verificar que no haya tokens hardcodeados
- Usa GitGuardian para escanear commits antes de hacer push
- Revisa regularmente los resultados de seguridad

### **Local:**
```bash
# Buscar tokens hardcodeados
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/ api/

# Verificar configuración
npm run build
npm run lint
```

## 📞 **Soporte**

Si encuentras problemas con la configuración de WATI:
1. Verifica que las variables de entorno estén configuradas
2. Confirma que los tokens sean válidos
3. Revisa los logs de la consola para mensajes de error
4. Contacta al equipo de desarrollo si persisten los problemas

## 🔄 **Actualización de Tokens**

Si necesitas actualizar los tokens:
1. Obtén nuevos tokens de WATI
2. Actualiza las variables de entorno
3. **NO** actualices el código fuente
4. Haz redeploy de la aplicación

---

**Recuerda: La seguridad es responsabilidad de todos. Nunca comprometas tokens o credenciales en el código fuente.**
