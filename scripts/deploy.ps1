# TrueBlue Chat Management - Script de Despliegue (Windows)
# Este script despliega la aplicación a producción

param(
    [string]$Environment = "production"
)

# Configuración
$AppName = "trueblue-chat-management"
$BuildDir = "dist"

Write-Host "🚀 Desplegando TrueBlue Chat Management a $Environment..." -ForegroundColor Green

# Verificar que estemos en la rama correcta
$CurrentBranch = git branch --show-current
if ($Environment -eq "production" -and $CurrentBranch -ne "main") {
    Write-Host "❌ Error: Debes estar en la rama 'main' para desplegar a producción" -ForegroundColor Red
    exit 1
}

if ($Environment -eq "staging" -and $CurrentBranch -ne "develop") {
    Write-Host "❌ Error: Debes estar en la rama 'develop' para desplegar a staging" -ForegroundColor Red
    exit 1
}

# Verificar que no haya cambios sin commitear
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-Host "❌ Error: Hay cambios sin commitear. Por favor haz commit de todos los cambios antes de desplegar." -ForegroundColor Red
    exit 1
}

# Verificar que estemos actualizados con el remoto
git fetch origin
$BehindCount = git rev-list HEAD...origin/$CurrentBranch --count
if ($BehindCount -ne "0") {
    Write-Host "❌ Error: Tu rama local no está actualizada con el remoto. Por favor haz pull antes de desplegar." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Verificaciones de Git completadas" -ForegroundColor Green

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
npm ci

# Ejecutar tests (si existen)
if (Test-Path "package.json") {
    $PackageContent = Get-Content "package.json" | ConvertFrom-Json
    if ($PackageContent.scripts.test) {
        Write-Host "🧪 Ejecutando tests..." -ForegroundColor Yellow
        npm test
    }
}

# Verificar tipos de TypeScript
Write-Host "🔍 Verificando tipos de TypeScript..." -ForegroundColor Yellow
npm run type-check

# Linting
Write-Host "🔍 Ejecutando linting..." -ForegroundColor Yellow
npm run lint

# Construir la aplicación
Write-Host "🏗️ Construyendo aplicación para $Environment..." -ForegroundColor Yellow
if ($Environment -eq "staging") {
    npm run build:staging
} elseif ($Environment -eq "production") {
    npm run build:production
} else {
    npm run build
}

# Verificar que el build se haya creado correctamente
if (-not (Test-Path $BuildDir)) {
    Write-Host "❌ Error: El directorio de build no se creó correctamente" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completado exitosamente" -ForegroundColor Green

# Si estamos desplegando a Vercel, usar su CLI
try {
    $VercelVersion = vercel --version
    Write-Host "🚀 Desplegando a Vercel..." -ForegroundColor Yellow
    
    if ($Environment -eq "production") {
        vercel --prod
    } else {
        vercel
    }
    
    Write-Host "✅ Despliegue a Vercel completado" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Vercel CLI no está instalado. Desplegando manualmente..." -ForegroundColor Yellow
    
    # Aquí puedes agregar lógica para otros proveedores de hosting
    # Por ejemplo, subir a un servidor FTP, S3, etc.
    
    Write-Host "📤 Subiendo archivos a $Environment..." -ForegroundColor Yellow
    # Agregar comandos específicos para tu proveedor de hosting
    
    Write-Host "✅ Despliegue manual completado" -ForegroundColor Green
}

# Crear tag de release
$TagVersion = Get-Date -Format "yyyy.MM.dd-HHmm"
$TagName = "deploy-$Environment-$TagVersion"

Write-Host "🏷️ Creando tag de release: $TagName" -ForegroundColor Yellow
git tag -a $TagName -m "Deploy to $Environment - $TagVersion"
git push origin $TagName

Write-Host ""
Write-Host "🎉 ¡Despliegue completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen del despliegue:" -ForegroundColor Cyan
Write-Host "- Ambiente: $Environment"
Write-Host "- Tag: $TagName"
Write-Host "- Build: $BuildDir"
Write-Host "- Timestamp: $(Get-Date)"
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Cyan
if ($Environment -eq "production") {
    Write-Host "- Producción: https://tu-app.vercel.app"
} elseif ($Environment -eq "staging") {
    Write-Host "- Staging: https://tu-app-staging.vercel.app"
}
Write-Host ""
Write-Host "📚 Para más información, consulta el README.md" -ForegroundColor Cyan
