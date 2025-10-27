-- Configuración del Storage de Supabase para adjuntar archivos
-- Este script crea el bucket y las políticas necesarias para el sistema de archivos adjuntos

-- Crear bucket para archivos adjuntos
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Política de upload: Solo usuarios autenticados pueden subir archivos
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Política de lectura pública: Todos pueden ver los archivos adjuntos
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Política de actualización: Solo usuarios autenticados pueden actualizar sus archivos
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments')
WITH CHECK (bucket_id = 'chat-attachments');

-- Política de eliminación: Solo usuarios autenticados pueden eliminar sus archivos
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');

-- Nota: Los archivos se organizan en la estructura: {client_id}/{conversation_id}/{filename}
-- Esto permite el aislamiento por cliente y conversación

