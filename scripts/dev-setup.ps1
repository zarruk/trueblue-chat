# TrueBlue Chat Management - Script de Configuración de Desarrollo (Windows)
# Este script configura el entorno de desarrollo local en Windows

Write-Host "🚀 Configurando TrueBlue Chat Management para desarrollo..." -ForegroundColor Green

# Verificar que Node.js esté instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero." -ForegroundColor Red
    exit 1
}

# Verificar que Docker esté instalado
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado. Por favor instala Docker Desktop primero." -ForegroundColor Red
    exit 1
}

# Verificar que Docker Compose esté instalado
try {
    $dockerComposeVersion = docker-compose --version
    Write-Host "✅ Docker Compose encontrado: $dockerComposeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencias verificadas correctamente" -ForegroundColor Green

# Instalar dependencias de Node.js
Write-Host "📦 Instalando dependencias de Node.js..." -ForegroundColor Yellow
npm install

# Crear archivo de variables de entorno local
if (-not (Test-Path ".env.local")) {
    Write-Host "🔧 Creando archivo de variables de entorno local..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env.local"
    Write-Host "📝 Por favor edita .env.local con tus credenciales de Supabase" -ForegroundColor Cyan
} else {
    Write-Host "✅ Archivo .env.local ya existe" -ForegroundColor Green
}

# Iniciar servicios de Docker
Write-Host "🐳 Iniciando servicios de Docker..." -ForegroundColor Yellow
docker-compose up -d postgres redis n8n

Write-Host "⏳ Esperando que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar que los servicios estén funcionando
Write-Host "🔍 Verificando servicios..." -ForegroundColor Yellow
$services = docker-compose ps
if ($services -match "Up") {
    Write-Host "✅ Servicios de Docker iniciados correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error iniciando servicios de Docker" -ForegroundColor Red
    exit 1
}

# Construir la aplicación
Write-Host "🏗️ Construyendo la aplicación..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "🎉 ¡Configuración completada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Edita .env.local con tus credenciales de Supabase"
Write-Host "2. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
Write-Host "3. Accede a http://localhost:5173 en tu navegador"
Write-Host ""
Write-Host "🔧 Servicios disponibles:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:5173"
Write-Host "- n8n: http://localhost:5678 (admin/admin123)"
Write-Host "- PostgreSQL: localhost:5432"
Write-Host "- Redis: localhost:6379"
Write-Host ""
Write-Host "📚 Para más información, consulta el README.md" -ForegroundColor Cyan
