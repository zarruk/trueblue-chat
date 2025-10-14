# 🛠️ Solución: Carga Infinita en Staging

## 📋 Problema Identificado

Al hacer login con magic link en **staging**, la aplicación se quedaba cargando infinitamente después de recargar la página. Este problema **NO ocurría en local**.

### Síntomas:
- ✅ En el primer login, todo funcionaba bien
- ❌ Al recargar la página, quedaba cargando infinitamente
- 🔍 Los logs mostraban **3 llamadas simultáneas** a la consulta de profiles

```
🔍 Consulta profiles completada. Data: Object Error: null
🔍 Consulta profiles completada. Data: Object Error: null
🔍 Consulta profiles completada. Data: Object Error: null
```

## 🎯 Causa Raíz

En `src/hooks/useAuth.tsx`, había **dos flujos paralelos** que intentaban cargar el perfil del usuario:

1. **`onAuthStateChange`** (línea 158) - Se dispara cuando cambia el estado de autenticación
2. **`getSession()`** (línea 179) - Se ejecutaba inmediatamente al montar el componente

### ¿Por qué pasaba solo en staging?

- En **local**, las llamadas a Supabase son rápidas y las condiciones de carrera no se notan
- En **staging**, las llamadas son más lentas (latencia de red), haciendo que las llamadas se solapen
- Esto causaba que `setProfileLoading(false)` se ejecutara en orden incorrecto
- El estado `loading` nunca se reseteaba correctamente → **pantalla de carga infinita**

## ✅ Solución Implementada

### 1️⃣ Protección contra Llamadas Duplicadas

Agregué una bandera de referencia `isLoadingProfileRef` para evitar que `loadProfile()` se ejecute múltiples veces simultáneamente:

```typescript
const isLoadingProfileRef = useRef(false); // 🛡️ Protección contra llamadas duplicadas

const loadProfile = async (u: User, skipLoadingState = false) => {
  // 🛡️ PROTECCIÓN: Si ya hay una carga en progreso, ignorar esta llamada
  if (isLoadingProfileRef.current) {
    console.log('⏭️ loadProfile: Ya hay una carga en progreso, ignorando...');
    return;
  }
  
  isLoadingProfileRef.current = true;
  console.log('🔐 loadProfile: Iniciando carga de perfil...');
  
  try {
    // ... lógica de carga del perfil ...
  } finally {
    isLoadingProfileRef.current = false; // 🔓 Liberar la bandera siempre
    console.log('🔓 loadProfile: Carga completada, bandera liberada');
  }
}
```

### 2️⃣ Eliminación de Código Redundante

Eliminé la llamada redundante a `getSession()` porque:
- `onAuthStateChange` ya dispara automáticamente el evento `INITIAL_SESSION` al montarse
- Tener ambas llamadas causaba las 3 ejecuciones simultáneas

**ANTES:**
```typescript
// ❌ Dos flujos paralelos
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    await loadProfile(u);
  }
});

supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (u) {
    await loadProfile(u); // ← REDUNDANTE!
  }
});
```

**DESPUÉS:**
```typescript
// ✅ Un solo flujo
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
    await loadProfile(u);
  }
});

// ✅ ELIMINADO: getSession() redundante
```

### 3️⃣ Reseteo Seguro de Estados

Aseguré que los estados de loading siempre se reseteen correctamente, incluso en casos edge:

```typescript
} else {
  console.log('⏭️ Evento de auth no requiere recarga de perfil:', event);
  // Asegurar que loading se resetee incluso si no cargamos perfil
  if (!profileLoadedRef.current) {
    setProfileLoading(false);
  }
  setAuthLoading(false);
}
```

## 📊 Resultados Esperados

### Antes del Fix:
1. Click en magic link → ✅ Funciona
2. Recarga de página → ❌ Carga infinita
3. Logs → 🔴 3 llamadas simultáneas a profiles

### Después del Fix:
1. Click en magic link → ✅ Funciona
2. Recarga de página → ✅ Funciona
3. Logs → 🟢 1 sola llamada a profiles

## 🧪 Cómo Probar

1. **Hacer login con magic link** en staging
2. **Esperar a que cargue** la página principal con las conversaciones
3. **Recargar la página** (F5 o Ctrl+R)
4. **Verificar que:**
   - La página carga correctamente sin quedarse en pantalla de carga
   - En los logs solo aparece 1 llamada a "Consulta profiles completada"
   - Las conversaciones se muestran normalmente

## 🔍 Logs Esperados Después del Fix

```
🔍 MOBILE DEBUG - AuthProvider useEffect started
🔄 Auth state changed: INITIAL_SESSION juanca+suenos@azteclab.co
🔐 loadProfile: Iniciando carga de perfil...
🔍 Buscando/creando perfil para usuario: juanca+suenos@azteclab.co
🔍 Ejecutando consulta a tabla profiles...
🔍 Consulta profiles completada. Data: Object Error: null
🏁 Perfil final cargado en Auth: {...}
🔓 loadProfile: Carga completada, bandera liberada
```

**Nota:** Solo debe haber **UNA** línea de "Consulta profiles completada", no tres.

## 📝 Archivos Modificados

- `src/hooks/useAuth.tsx` - Protección contra llamadas duplicadas y eliminación de código redundante

## 🚀 Despliegue

Para probar en staging:
```bash
git add .
git commit -m "fix: Solucionar carga infinita en staging al recargar página"
git push origin staging0509
```

---

**Fecha de Fix:** 14 de Octubre, 2025  
**Problema:** Carga infinita al recargar en staging  
**Solución:** Protección contra llamadas duplicadas + eliminación de código redundante

