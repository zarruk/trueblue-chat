# Script para aplicar la función de conversaciones priorizadas en Supabase
# Ejecutar: .\scripts\apply-prioritized-conversations-function.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Aplicar Función de Conversaciones Priorizadas" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Esta función permite ordenar conversaciones por prioridad:" -ForegroundColor Yellow
Write-Host "   1. pending_human (máxima prioridad)" -ForegroundColor White
Write-Host "   2. pending_response" -ForegroundColor White
Write-Host "   3. active_human" -ForegroundColor White
Write-Host "   4. active_ai" -ForegroundColor White
Write-Host "   5. closed (mínima prioridad)" -ForegroundColor White
Write-Host ""

Write-Host "📝 PASOS A SEGUIR:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Abre el Dashboard de Supabase:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/YOUR_PROJECT/editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Ve a la sección 'SQL Editor' en el menú lateral" -ForegroundColor White
Write-Host ""
Write-Host "3. Copia el contenido del archivo:" -ForegroundColor White
Write-Host "   scripts/create-prioritized-conversations-function.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Pégalo en el editor SQL y ejecuta (RUN)" -ForegroundColor White
Write-Host ""
Write-Host "5. Verifica que no haya errores en la ejecución" -ForegroundColor White
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$openFile = Read-Host "¿Quieres abrir el archivo SQL ahora? (s/n)"
if ($openFile -eq "s" -or $openFile -eq "S") {
    $sqlFile = Join-Path $PSScriptRoot "create-prioritized-conversations-function.sql"
    if (Test-Path $sqlFile) {
        Write-Host "✅ Abriendo archivo SQL..." -ForegroundColor Green
        Start-Process notepad.exe -ArgumentList $sqlFile
    } else {
        Write-Host "❌ No se encontró el archivo SQL" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✨ Una vez ejecutado el SQL, la aplicación usará automáticamente" -ForegroundColor Green
Write-Host "   el nuevo ordenamiento por prioridad." -ForegroundColor Green
Write-Host ""

