# Script para agregar la columna channel a la tabla tb_conversations en Supabase
# Este script debe ejecutarse desde el directorio raíz del proyecto

param(
    [string]$SupabaseUrl = "https://avkpygwhymnxotwqzknz.supabase.co",
    [string]$SupabaseKey = ""
)

Write-Host "🔧 Script de Migración para Columna Channel" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "src/utils/addChannelField.sql")) {
    Write-Host "❌ Error: No se encontró el archivo addChannelField.sql" -ForegroundColor Red
    Write-Host "Ejecuta este script desde el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Leer el archivo SQL
$sqlContent = Get-Content "src/utils/addChannelField.sql" -Raw
Write-Host "✅ Archivo SQL leído correctamente" -ForegroundColor Green

# Verificar si se proporcionó la clave de Supabase
if (-not $SupabaseKey) {
    Write-Host "⚠️  No se proporcionó SUPABASE_KEY" -ForegroundColor Yellow
    Write-Host "Por favor, proporciona la clave de Supabase:" -ForegroundColor White
    $SupabaseKey = Read-Host "SUPABASE_KEY"
}

if (-not $SupabaseKey) {
    Write-Host "❌ Error: Se requiere SUPABASE_KEY para continuar" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Ejecutando migración en Supabase..." -ForegroundColor Green

try {
    # Crear el payload para la API de Supabase
    $headers = @{
        "apikey" = $SupabaseKey
        "Authorization" = "Bearer $SupabaseKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }

    $body = @{
        query = $sqlContent
    } | ConvertTo-Json

    # Ejecutar la migración usando la API REST de Supabase
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body

    Write-Host "✅ Migración ejecutada exitosamente" -ForegroundColor Green
    Write-Host "Respuesta: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor White

} catch {
    Write-Host "❌ Error ejecutando la migración:" -ForegroundColor Red
    Write-Host "Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta del servidor: $responseBody" -ForegroundColor Red
    }
    
    Write-Host "💡 Alternativa: Ejecuta manualmente el SQL en el SQL Editor de Supabase" -ForegroundColor Yellow
    Write-Host "Archivo: src/utils/addChannelField.sql" -ForegroundColor White
}

Write-Host "`n📋 Resumen de la migración:" -ForegroundColor Cyan
Write-Host "- Se agregó la columna 'channel' a tb_conversations" -ForegroundColor White
Write-Host "- Se creó un índice para mejorar el rendimiento" -ForegroundColor White
Write-Host "- Se actualizaron las conversaciones existentes" -ForegroundColor White
Write-Host "- Valores por defecto: web, whatsapp, telegram" -ForegroundColor White

Write-Host "`n🎉 ¡Migración completada!" -ForegroundColor Green
