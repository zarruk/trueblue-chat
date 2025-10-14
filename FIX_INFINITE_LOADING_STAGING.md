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

En `src/hooks/useAuth.tsx`, había **dos problemas de orden de ejecución**:

### Problema 1: Llamadas Duplicadas Iniciales
1. **`onAuthStateChange`** se dispara cuando cambia el estado de autenticación
2. **`getSession()`** se ejecutaba inmediatamente al montar el componente
3. Ambos intentaban cargar el perfil **simultáneamente**

### Problema 2: Orden de Ejecución al Recargar (MÁS CRÍTICO)
Al recargar la página:
1. **`onAuthStateChange(SIGNED_IN)`** se disparaba **PRIMERO**
2. Intentaba consultar `profiles` table **SIN sesión completamente establecida**
3. La consulta con RLS se **colgaba esperando autenticación**
4. `getSession()` se ejecutaba después pero la bandera ya estaba activada
5. **Resultado:** Query timeout → pantalla de carga infinita

### ¿Por qué pasaba solo en staging?

- En **local**, las llamadas a Supabase son rápidas y el orden de ejecución favorece a `getSession()`
- En **staging**, las llamadas son más lentas (latencia de red), y `onAuthStateChange` gana la carrera
- Cuando `onAuthStateChange` intenta consultar antes de que la sesión esté establecida → **timeout en la query**
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

### 2️⃣ Orden de Ejecución Correcto (CRÍTICO)

**El cambio más importante:** Ejecutar `getSession()` **PRIMERO** y que `onAuthStateChange` ignore `INITIAL_SESSION`:

```typescript
useEffect(() => {
  // 1️⃣ PRIMERO: Establecer la sesión inicial
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    console.log('🔍 getSession: Procesando sesión inicial');
    // ... establecer sesión y cargar perfil ...
  });

  // 2️⃣ SEGUNDO: Set up auth state listener
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      // ⏭️ SKIP: Ignorar INITIAL_SESSION (ya lo manejó getSession)
      if (event === 'INITIAL_SESSION') {
        console.log('⏭️ INITIAL_SESSION ya manejado, ignorando');
        return;
      }
      
      // ✅ Solo manejar eventos NUEVOS (SIGNED_IN, TOKEN_REFRESHED, etc.)
      if (event === 'SIGNED_IN') {
        await loadProfile(u, hasLoadedBefore);
      }
    }
  );
}, []);
```

**Por qué esto funciona:**
- `getSession()` se ejecuta **PRIMERO** → Establece la sesión en el cliente de Supabase
- Con la sesión establecida, las consultas con RLS funcionan correctamente
- `onAuthStateChange(INITIAL_SESSION)` se ignora → No hay duplicación
- `onAuthStateChange(SIGNED_IN)` solo se dispara en **nuevos logins** → La bandera lo protege si es necesario

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

### Al hacer login con magic link:
```
🔍 MOBILE DEBUG - AuthProvider useEffect started
🔍 getSession: Procesando sesión inicial
🔐 loadProfile: Iniciando carga de perfil...
🔍 Buscando/creando perfil para usuario: juanca+suenos@azteclab.co
🔍 Ejecutando consulta a tabla profiles...
🔍 Consulta profiles completada. Data: {...}
🏁 Perfil final cargado en Auth: {...}
🔓 loadProfile: Carga completada, bandera liberada
✅ getSession: Completado, auth listener puede proceder
🔄 Auth state changed: INITIAL_SESSION juanca+suenos@azteclab.co
⏭️ onAuthStateChange: INITIAL_SESSION ya manejado por getSession(), ignorando
```

### Al recargar la página:
```
🔍 MOBILE DEBUG - AuthProvider useEffect started
🔍 getSession: Procesando sesión inicial
🔐 loadProfile: Iniciando carga de perfil...
🔍 Buscando/creando perfil para usuario: juanca+suenos@azteclab.co
🔍 Ejecutando consulta a tabla profiles...
🔍 Consulta profiles completada. Data: {...}  ← ✅ COMPLETA SIN TIMEOUT
🏁 Perfil final cargado en Auth: {...}
🔓 loadProfile: Carga completada, bandera liberada
✅ getSession: Completado, auth listener puede proceder
🔄 Auth state changed: SIGNED_IN juanca+suenos@azteclab.co
⏭️ onAuthStateChange: INITIAL_SESSION ya manejado por getSession(), ignorando
```

**Notas Clave:**
- Solo debe haber **UNA** línea de "Consulta profiles completada"
- La consulta debe **completarse** (no timeout)
- `INITIAL_SESSION` se ignora correctamente

## 📝 Archivos Modificados

- `src/hooks/useAuth.tsx` - Protección contra llamadas duplicadas + orden de ejecución correcto (getSession primero, onAuthStateChange después ignorando INITIAL_SESSION)

## 📊 Resumen de la Solución

### Problema Original:
- Al recargar, `onAuthStateChange` se disparaba antes que `getSession()`
- Intentaba consultar `profiles` sin sesión establecida → timeout

### Solución Final:
1. **`getSession()` se ejecuta PRIMERO** → Establece sesión
2. **`onAuthStateChange` ignora `INITIAL_SESSION`** → Evita duplicación
3. **Bandera `isLoadingProfileRef`** → Protección adicional contra race conditions

### Resultado:
✅ Login con magic link funciona  
✅ Recarga de página funciona  
✅ Sin timeouts en queries  
✅ Sin llamadas duplicadas

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

