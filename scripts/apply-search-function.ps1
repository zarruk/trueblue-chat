# Script para aplicar la función de búsqueda de conversaciones
Write-Host "=== Aplicando función de búsqueda global ===" -ForegroundColor Cyan

# Leer las variables de entorno
$envFile = if ($args[0] -eq "production") { ".env.production" } else { ".env.staging" }
Write-Host "Usando archivo de entorno: $envFile" -ForegroundColor Yellow

# Verificar que el archivo existe
if (-not (Test-Path $envFile)) {
    Write-Host "Error: No se encontró el archivo $envFile" -ForegroundColor Red
    exit 1
}

# Leer variables de entorno
$env:VITE_SUPABASE_URL = (Get-Content $envFile | Where-Object { $_ -match "^VITE_SUPABASE_URL=" }) -replace "VITE_SUPABASE_URL=", ""
$env:SUPABASE_SERVICE_ROLE_KEY = (Get-Content $envFile | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "SUPABASE_SERVICE_ROLE_KEY=", ""

if (-not $env:VITE_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Error: No se pudieron leer las variables de entorno necesarias" -ForegroundColor Red
    exit 1
}

Write-Host "`nPor favor, ejecuta el siguiente SQL en Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor DarkGray

# Leer y mostrar el contenido SQL
if (Test-Path "scripts/create-search-conversations-function.sql") {
    $sqlContent = Get-Content "scripts/create-search-conversations-function.sql" -Raw
    Write-Host $sqlContent -ForegroundColor White
} else {
    Write-Host "Error: No se encontró el archivo scripts/create-search-conversations-function.sql" -ForegroundColor Red
    exit 1
}

Write-Host "----------------------------------------" -ForegroundColor DarkGray
Write-Host "`nNota: También ejecuta el SQL de scripts/create-get-conversations-ordered-function.sql si no lo has hecho" -ForegroundColor Yellow
Write-Host "`nPresiona Enter cuando hayas ejecutado el SQL..." -ForegroundColor Yellow
Read-Host

Write-Host "`n✅ Función de búsqueda aplicada" -ForegroundColor Green
Write-Host "`nEl scroll infinito y búsqueda global están listos para usar:" -ForegroundColor Cyan
Write-Host "- Primera carga: 50 conversaciones" -ForegroundColor White
Write-Host "- Cada scroll: +30 conversaciones más" -ForegroundColor White
Write-Host "- Búsqueda: 50 mejores resultados (sin scroll)" -ForegroundColor White
Write-Host "- Filtros locales: funcionan con scroll infinito" -ForegroundColor White
Write-Host "`n=== Proceso completado ===" -ForegroundColor Cyan













