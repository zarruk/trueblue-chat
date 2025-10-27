# Funcionalidad de Adjuntar Archivos

## Descripción

Se ha implementado la funcionalidad para que los agentes puedan adjuntar imágenes y documentos desde el dashboard del chat. Los archivos se suben a Supabase Storage y se guardan referencias en el campo `metadata` de los mensajes.

## Configuración

### 1. Configurar Supabase Storage

Ejecuta el siguiente script SQL en tu base de datos de Supabase:

```bash
# Desde la terminal de Supabase
psql <DATABASE_URL> < scripts/setup-storage.sql
```

O copia y pega el contenido de `scripts/setup-storage.sql` en el editor SQL de Supabase.

### 2. Estructura de Storage

Los archivos se organizan en la siguiente estructura:
```
chat-attachments/
  └── {client_id}/
      └── {conversation_id}/
          └── {filename}
```

Esto permite:
- **Aislamiento por cliente**: Cada cliente tiene su propio espacio
- **Organización por conversación**: Archivos agrupados por conversación
- **Nombres únicos**: Se generan nombres únicos para evitar conflictos

## Funcionalidades Implementadas

### 1. Subida de Archivos (`fileUploadService.ts`)

- ✅ Validación de tipo de archivo
- ✅ Validación de tamaño (máximo 10 MB)
- ✅ Generación de nombres únicos
- ✅ Upload a Supabase Storage
- ✅ Retorno de URL pública
- ✅ Manejo de errores

### 2. UI en ChatWindow

- ✅ Botón de adjuntar (Paperclip icon)
- ✅ Input de archivos oculto
- ✅ Preview de archivos seleccionados
- ✅ Barra de progreso durante upload
- ✅ Botón para remover archivos
- ✅ Indicador de carga

### 3. Visualización de Archivos

- ✅ **Imágenes**: Se muestran inline con preview
- ✅ **Documentos**: Se muestran con icono, nombre y botón de descarga
- ✅ Compatibilidad con sistema existente (WhatsApp/Instagram)
- ✅ Visor de imágenes ampliado

## Tipos de Archivos Soportados

### Imágenes
- JPEG, JPG
- PNG
- GIF
- WEBP

### Documentos
- PDF
- DOCX (Word)
- XLSX (Excel)
- DOC (Word legado)
- XLS (Excel legado)

## Límites

- **Tamaño máximo**: 10 MB por archivo
- **Archivos por mensaje**: 1 (expandible en el futuro)

## Uso

### Para el Usuario Final

1. **Seleccionar archivo**: Haz clic en el ícono de paperclip
2. **Elegir archivo**: Selecciona el archivo de tu dispositivo
3. **Ver preview**: El archivo aparece en la lista de archivos seleccionados
4. **Escribir mensaje** (opcional): Agrega texto si lo deseas
5. **Enviar**: Haz clic en el botón de enviar
6. **Ver progreso**: Una barra de progreso muestra el avance del upload
7. **Ver archivo**: El archivo aparece en el chat según su tipo

### Para Desarrolladores

#### Subir un archivo programáticamente

```typescript
import { uploadFile } from '@/services/fileUploadService'

const result = await uploadFile(
  file,
  clientId,
  conversationId,
  (progress) => console.log(`Progress: ${progress}%`)
)

if (result.success && result.metadata) {
  console.log('File uploaded:', result.metadata)
}
```

#### Formato del Metadata

```typescript
{
  "file-url": "https://supabase.../file.jpg",
  "file-type": "image/jpeg",
  "file-name": "imagen.jpg",
  "file-size": 1024000,
  "source": "dashboard"
}
```

#### Validar archivo antes de subir

```typescript
import { validateFile } from '@/services/fileUploadService'

const validation = validateFile(file)
if (!validation.valid) {
  console.error(validation.error)
}
```

## Compatibilidad con Sistema Actual

La implementación mantiene compatibilidad con el sistema actual de URLs externas:

### Archivos desde el Dashboard
- Se suben a Supabase Storage
- Metadata: `file-url`, `file-type`, `file-name`, etc.
- Source: `dashboard`

### Archivos de WhatsApp/Instagram
- Vienen como URLs externas
- Metadata: `img-url` o `imgUrl`
- Source: `whatsapp`, `instagram`, etc.

El sistema detecta automáticamente el tipo de archivo y lo muestra apropiadamente.

## Estructura de Archivos Modificados

```
src/
├── services/
│   └── fileUploadService.ts          # Nuevo: Servicio de upload
├── components/
│   └── ChatWindow.tsx                # Modificado: UI y lógica de archivos
└── hooks/
    └── useConversations.tsx           # Modificado: Manejo de metadata

scripts/
└── setup-storage.sql                  # Nuevo: Script de configuración

FILE_ATTACHMENT_README.md              # Este archivo
```

## Próximas Mejoras (Opcional)

1. **Múltiples archivos por mensaje**: Permitir seleccionar y enviar varios archivos a la vez
2. **Compresión de imágenes**: Compresión automática de imágenes grandes
3. **Preview de imágenes**: Mostrar miniaturas antes de enviar
4. **Ordenamiento de archivos**: Priorizar archivos recientes
5. **Búsqueda de archivos**: Buscar archivos en conversación por nombre

## Troubleshooting

### El archivo no se sube

1. Verifica que el bucket `chat-attachments` existe en Supabase
2. Verifica que las políticas de acceso están configuradas
3. Revisa la consola del navegador para errores
4. Verifica que el archivo cumple con los límites (tipo y tamaño)

### Los archivos no se muestran en el chat

1. Verifica que el metadata está en el formato correcto
2. Revisa que la URL del archivo es accesible
3. Verifica los permisos del bucket (debe ser público para lectura)

### Error de CORS

1. Verifica que el bucket tiene política de lectura pública
2. Asegúrate de que el dominio está permitido en Supabase

## Testing

Para probar la funcionalidad:

1. Abre una conversación en el dashboard
2. Haz clic en el ícono de paperclip
3. Selecciona una imagen → Verifica que aparece en el preview
4. Escribe un mensaje (opcional)
5. Envía el mensaje → Verifica el progreso
6. Verifica que la imagen aparece en el chat
7. Haz clic en la imagen → Debe abrirse en el visor
8. Repite con un PDF → Debe mostrar icono de documento

### Casos de Error a Probar

1. Archivo > 10 MB → Debe mostrar error
2. Tipo no permitido → Debe mostrar error
3. Sin conexión → Debe mostrar error
4. Sin seleccionar archivo → Botón deshabilitado

## Seguridad

- ✅ Validación de tipos en frontend
- ✅ Validación de tamaño en frontend
- ✅ Políticas de acceso en Supabase
- ✅ Nombres de archivo sanitizados
- ✅ Paths con client_id para aislamiento
- ✅ Autenticación requerida para upload

## Notas Importantes

1. Los archivos se almacenan permanentemente en Supabase Storage
2. No hay límite de duración de archivos
3. Los archivos se pueden eliminar manualmente desde Supabase si es necesario
4. El espacio de almacenamiento está sujeto a los límites de tu plan de Supabase

