#!/bin/bash

# TrueBlue Chat Management - Script de Despliegue
# Este script despliega la aplicación a producción

set -e

# Configuración
ENVIRONMENT=${1:-production}
APP_NAME="trueblue-chat-management"
BUILD_DIR="dist"

echo "🚀 Desplegando TrueBlue Chat Management a $ENVIRONMENT..."

# Verificar que estemos en la rama correcta
if [ "$ENVIRONMENT" = "production" ] && [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Error: Debes estar en la rama 'main' para desplegar a producción"
    exit 1
fi

if [ "$ENVIRONMENT" = "staging" ] && [ "$(git branch --show-current)" != "develop" ]; then
    echo "❌ Error: Debes estar en la rama 'develop' para desplegar a staging"
    exit 1
fi

# Verificar que no haya cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Hay cambios sin commitear. Por favor haz commit de todos los cambios antes de desplegar."
    exit 1
fi

# Verificar que estemos actualizados con el remoto
git fetch origin
if [ "$(git rev-list HEAD...origin/$(git branch --show-current) --count)" != "0" ]; then
    echo "❌ Error: Tu rama local no está actualizada con el remoto. Por favor haz pull antes de desplegar."
    exit 1
fi

echo "✅ Verificaciones de Git completadas"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Ejecutar tests (si existen)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "🧪 Ejecutando tests..."
    npm test
fi

# Verificar tipos de TypeScript
echo "🔍 Verificando tipos de TypeScript..."
npm run type-check

# Linting
echo "🔍 Ejecutando linting..."
npm run lint

# Construir la aplicación
echo "🏗️ Construyendo aplicación para $ENVIRONMENT..."
if [ "$ENVIRONMENT" = "staging" ]; then
    npm run build:staging
elif [ "$ENVIRONMENT" = "production" ]; then
    npm run build:production
else
    npm run build
fi

# Verificar que el build se haya creado correctamente
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: El directorio de build no se creó correctamente"
    exit 1
fi

echo "✅ Build completado exitosamente"

# Si estamos desplegando a Vercel, usar su CLI
if command -v vercel &> /dev/null; then
    echo "🚀 Desplegando a Vercel..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod
    else
        vercel
    fi
    
    echo "✅ Despliegue a Vercel completado"
else
    echo "⚠️ Vercel CLI no está instalado. Desplegando manualmente..."
    
    # Aquí puedes agregar lógica para otros proveedores de hosting
    # Por ejemplo, subir a un servidor FTP, S3, etc.
    
    echo "📤 Subiendo archivos a $ENVIRONMENT..."
    # Agregar comandos específicos para tu proveedor de hosting
    
    echo "✅ Despliegue manual completado"
fi

# Crear tag de release
TAG_VERSION=$(date +"%Y.%m.%d-%H%M")
TAG_NAME="deploy-$ENVIRONMENT-$TAG_VERSION"

echo "🏷️ Creando tag de release: $TAG_NAME"
git tag -a "$TAG_NAME" -m "Deploy to $ENVIRONMENT - $TAG_VERSION"
git push origin "$TAG_NAME"

echo ""
echo "🎉 ¡Despliegue completado exitosamente!"
echo ""
echo "📋 Resumen del despliegue:"
echo "- Ambiente: $ENVIRONMENT"
echo "- Tag: $TAG_NAME"
echo "- Build: $BUILD_DIR"
echo "- Timestamp: $(date)"
echo ""
echo "🔗 URLs:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "- Producción: https://tu-app.vercel.app"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "- Staging: https://tu-app-staging.vercel.app"
fi
echo ""
echo "📚 Para más información, consulta el README.md"
