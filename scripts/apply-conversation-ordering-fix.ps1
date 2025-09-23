# Script para aplicar las funciones de ordenamiento de conversaciones
# Este script crea las funciones SQL necesarias para ordenar correctamente las conversaciones

Write-Host "=== Aplicando corrección de ordenamiento de conversaciones ===" -ForegroundColor Cyan

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

# Extraer el ID del proyecto de la URL
$projectId = ($env:VITE_SUPABASE_URL -split "\.")[0] -replace "https://", ""

Write-Host "Proyecto Supabase: $projectId" -ForegroundColor Green

# Función para ejecutar SQL
function Execute-SQL {
    param (
        [string]$SqlFile,
        [string]$Description
    )
    
    Write-Host "`n$Description" -ForegroundColor Yellow
    
    $sqlContent = Get-Content $SqlFile -Raw
    
    # Crear el body para la API
    $body = @{
        query = $sqlContent
    } | ConvertTo-Json
    
    # Ejecutar la consulta
    try {
        $response = Invoke-RestMethod `
            -Uri "$env:VITE_SUPABASE_URL/rest/v1/rpc/exec_sql" `
            -Method POST `
            -Headers @{
                "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
                "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
                "Content-Type" = "application/json"
                "Prefer" = "return=representation"
            } `
            -Body $body
        
        Write-Host "✓ $Description completado" -ForegroundColor Green
        return $true
    }
    catch {
        # Si exec_sql no existe, intentar con la API de SQL directamente
        Write-Host "Intentando método alternativo..." -ForegroundColor Yellow
        
        try {
            # Usar pgAdmin REST API o conexión directa
            Write-Host "Por favor, ejecuta el siguiente SQL manualmente en Supabase SQL Editor:" -ForegroundColor Cyan
            Write-Host "----------------------------------------" -ForegroundColor DarkGray
            Write-Host $sqlContent -ForegroundColor White
            Write-Host "----------------------------------------" -ForegroundColor DarkGray
            Write-Host "Presiona Enter cuando hayas ejecutado el SQL..." -ForegroundColor Yellow
            Read-Host
            
            Write-Host "✓ $Description completado (manual)" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "✗ Error en $Description" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
            return $false
        }
    }
}

# Aplicar las funciones SQL
$success = $true

# 1. Crear función de prioridad
if (Test-Path "scripts/create-conversation-priority-function.sql") {
    $result = Execute-SQL `
        -SqlFile "scripts/create-conversation-priority-function.sql" `
        -Description "Creando función de prioridad de conversaciones"
    if (-not $result) { $success = $false }
}

# 2. Crear función RPC para obtener conversaciones ordenadas
if (Test-Path "scripts/create-get-conversations-ordered-function.sql") {
    $result = Execute-SQL `
        -SqlFile "scripts/create-get-conversations-ordered-function.sql" `
        -Description "Creando función RPC para obtener conversaciones ordenadas"
    if (-not $result) { $success = $false }
}

if ($success) {
    Write-Host "`n✅ Todas las funciones se aplicaron correctamente" -ForegroundColor Green
    Write-Host "`nLas conversaciones ahora se ordenarán consistentemente por:" -ForegroundColor Cyan
    Write-Host "1. pending_human (más urgente)" -ForegroundColor White
    Write-Host "2. active_human con último mensaje del usuario" -ForegroundColor White
    Write-Host "3. pending_response" -ForegroundColor White
    Write-Host "4. active_human (ya respondidas)" -ForegroundColor White
    Write-Host "5. active_ai" -ForegroundColor White
    Write-Host "6. closed (menos urgente)" -ForegroundColor White
    Write-Host "`nDentro de cada prioridad, se ordenan por fecha de actualización (más reciente primero)" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Hubo errores al aplicar algunas funciones" -ForegroundColor Red
    Write-Host "Por favor, revisa los mensajes de error arriba" -ForegroundColor Yellow
}

Write-Host "`n=== Proceso completado ===" -ForegroundColor Cyan
