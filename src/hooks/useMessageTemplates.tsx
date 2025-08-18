import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

export interface MessageTemplate {
  id: string
  name: string
  message: string
  category: string
  created_by: string
  created_at: string
  updated_at: string
}

type NewTemplateInput = {
  name: string
  message: string
  category?: string
}

export function useMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Fetch message templates
  const fetchTemplates = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tb_message_templates')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching message templates:', error)
        toast.error('Error al cargar las plantillas de mensajes')
        return
      }

      setTemplates((data as any) || [])
    } catch (error) {
      console.error('Error fetching message templates:', error)
      toast.error('Error al cargar las plantillas de mensajes')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create new template
  const createTemplate = useCallback(async (templateData: NewTemplateInput) => {
    if (!user) {
      toast.error('Debes estar autenticado para crear plantillas')
      return false
    }

    try {
      const { error } = await supabase
        .from('tb_message_templates')
        .insert({
          name: templateData.name,
          message: templateData.message,
          category: templateData.category || 'general'
          // created_by/created_at/updated_at: confiar en defaults; policy de insert debe permitirlo
        })

      if (error) {
        console.error('Error creating template:', error)
        toast.error('Error al crear la plantilla')
        return false
      }

      toast.success('Plantilla creada exitosamente')
      await fetchTemplates()
      return true
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Error al crear la plantilla')
      return false
    }
  }, [user, fetchTemplates])

  // Update template
  const updateTemplate = useCallback(async (templateId: string, updates: Partial<Pick<MessageTemplate, 'name'|'message'|'category'>>) => {
    if (!user) {
      toast.error('Debes estar autenticado para actualizar plantillas')
      return false
    }

    try {
      const { error } = await supabase
        .from('tb_message_templates')
        .update({ ...updates })
        .eq('id', templateId)

      if (error) {
        console.error('Error updating template:', error)
        toast.error('Error al actualizar la plantilla')
        return false
      }

      toast.success('Plantilla actualizada exitosamente')
      await fetchTemplates()
      return true
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Error al actualizar la plantilla')
      return false
    }
  }, [user, fetchTemplates])

  // Delete template
  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!user) {
      toast.error('Debes estar autenticado para eliminar plantillas')
      return false
    }

    try {
      const { error } = await supabase
        .from('tb_message_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        console.error('Error deleting template:', error)
        toast.error('Error al eliminar la plantilla')
        return false
      }

      toast.success('Plantilla eliminada exitosamente')
      await fetchTemplates()
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Error al eliminar la plantilla')
      return false
    }
  }, [user, fetchTemplates])

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(template => template.category === category)
  }, [templates])

  // Get template by ID
  const getTemplateById = useCallback((templateId: string) => {
    return templates.find(template => template.id === templateId)
  }, [templates])

  // Search templates
  const searchTemplates = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return templates
    const lowerSearchTerm = searchTerm.toLowerCase()
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowerSearchTerm) ||
      template.message.toLowerCase().includes(lowerSearchTerm) ||
      template.category.toLowerCase().includes(lowerSearchTerm)
    )
  }, [templates])

  // Get categories
  const getCategories = useCallback(() => {
    const categories = new Set(templates.map(template => template.category))
    return Array.from(categories).sort()
  }, [templates])

  // Initial fetch
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesByCategory,
    getTemplateById,
    searchTemplates,
    getCategories,
    fetchTemplates
  }
}