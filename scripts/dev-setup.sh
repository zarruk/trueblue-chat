#!/bin/bash

# TrueBlue Chat Management - Script de Configuración de Desarrollo
# Este script configura el entorno de desarrollo local

set -e

echo "🚀 Configurando TrueBlue Chat Management para desarrollo..."

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

# Verificar que Docker Compose esté instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

echo "✅ Dependencias verificadas correctamente"

# Instalar dependencias de Node.js
echo "📦 Instalando dependencias de Node.js..."
npm install

# Crear archivo de variables de entorno local
if [ ! -f .env.local ]; then
    echo "🔧 Creando archivo de variables de entorno local..."
    cp env.example .env.local
    echo "📝 Por favor edita .env.local con tus credenciales de Supabase"
else
    echo "✅ Archivo .env.local ya existe"
fi

# Iniciar servicios de Docker
echo "🐳 Iniciando servicios de Docker..."
docker-compose up -d postgres redis n8n

echo "⏳ Esperando que los servicios estén listos..."
sleep 10

# Verificar que los servicios estén funcionando
echo "🔍 Verificando servicios..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Servicios de Docker iniciados correctamente"
else
    echo "❌ Error iniciando servicios de Docker"
    exit 1
fi

# Construir la aplicación
echo "🏗️ Construyendo la aplicación..."
npm run build

echo ""
echo "🎉 ¡Configuración completada exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita .env.local con tus credenciales de Supabase"
echo "2. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
echo "3. Accede a http://localhost:5173 en tu navegador"
echo ""
echo "🔧 Servicios disponibles:"
echo "- Frontend: http://localhost:5173"
echo "- n8n: http://localhost:5678 (admin/admin123)"
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo ""
echo "📚 Para más información, consulta el README.md"
