import { supabase } from '@/integrations/supabase/client'

export interface FileMetadata {
  'file-url': string
  'file-type': string
  'file-name': string
  'file-size': number
  source: 'dashboard'
}

export interface UploadResult {
  success: boolean
  metadata?: FileMetadata
  error?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/msword', // .doc
    'application/vnd.ms-excel', // .xls
  ],
}

const ALLOWED_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf', '.docx', '.xlsx', '.doc', '.xls'],
}

export function getAllowedTypes(): string[] {
  return [...ALLOWED_TYPES.images, ...ALLOWED_TYPES.documents]
}

export function isFileTypeAllowed(file: File): boolean {
  // Verificar por MIME type
  if (ALLOWED_TYPES.images.includes(file.type) || ALLOWED_TYPES.documents.includes(file.type)) {
    return true
  }

  // Verificar por extensión (fallback)
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  return (
    ALLOWED_EXTENSIONS.images.includes(extension) || ALLOWED_EXTENSIONS.documents.includes(extension)
  )
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Verificar tamaño
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo es demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
    }
  }

  // Verificar tipo
  if (!isFileTypeAllowed(file)) {
    const allowedExts = [
      ...ALLOWED_EXTENSIONS.images,
      ...ALLOWED_EXTENSIONS.documents,
    ].join(', ')
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Permitidos: ${allowedExts}`,
    }
  }

  return { valid: true }
}

function sanitizeFileName(fileName: string): string {
  // Eliminar caracteres especiales y espacios
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
}

function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.substring(originalName.lastIndexOf('.'))
  const sanitized = sanitizeFileName(originalName.replace(extension, ''))
  return `${sanitized}_${timestamp}_${random}${extension}`
}

export async function uploadFile(
  file: File,
  clientId: string,
  conversationId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validar archivo
    const validation = validateFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Generar nombre único y path
    const uniqueFileName = generateUniqueFileName(file.name)
    const filePath = `${clientId}/${conversationId}/${uniqueFileName}`

    // Mostrar progreso inicial
    onProgress?.(0)

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error subiendo archivo:', error)
      return { success: false, error: `Error al subir archivo: ${error.message}` }
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-attachments').getPublicUrl(data.path)

    // Notificar progreso completo
    onProgress?.(100)

    // Retornar metadata
    const metadata: FileMetadata = {
      'file-url': publicUrl,
      'file-type': file.type,
      'file-name': file.name,
      'file-size': file.size,
      source: 'dashboard',
    }

    return { success: true, metadata }
  } catch (error: any) {
    console.error('Error inesperado al subir archivo:', error)
    return { success: false, error: `Error inesperado: ${error.message}` }
  }
}

export async function uploadFiles(
  files: File[],
  clientId: string,
  conversationId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  const totalFiles = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fileProgress = ((i + 1) / totalFiles) * 100
    onProgress?.(fileProgress)

    const result = await uploadFile(file, clientId, conversationId)
    results.push(result)

    // Si un archivo falla, detener
    if (!result.success) {
      break
    }
  }

  return results
}

