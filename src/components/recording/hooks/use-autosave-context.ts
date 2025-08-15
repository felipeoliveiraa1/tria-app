import { useEffect, useRef, useCallback, useState } from 'react'
import { debounce } from 'lodash'

interface PatientContext {
  consultationId: string
  context: string
  attachments: Array<{
    id: string
    name: string
    type: string
    size: number
    uploadedAt: Date
  }>
  lastSaved: Date | null
}

export const useAutosaveContext = (consultationId: string) => {
  const [context, setContext] = useState<PatientContext>({
    consultationId,
    context: '',
    attachments: [],
    lastSaved: null
  })
  
  const isDirty = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Carregar contexto existente da API
  const loadContext = useCallback(async () => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.consultation?.patient_context) {
          setContext(prev => ({
            ...prev,
            context: data.consultation.patient_context || '',
            lastSaved: data.consultation.updated_at ? new Date(data.consultation.updated_at) : null
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar contexto da consulta:', error)
    }
  }, [consultationId])

  // Carregar contexto ao inicializar
  useEffect(() => {
    loadContext()
  }, [loadContext])

  // Salvar contexto para API
  const saveContext = useCallback(async (contextData: PatientContext) => {
    try {
      // Salvar na API real
      const response = await fetch('/api/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: consultationId,
          patient_context: contextData.context
        })
      })
      
      if (response.ok) {
        // Atualizar estado local
        setContext(prev => ({
          ...prev,
          lastSaved: new Date()
        }))
        
        isDirty.current = false
        console.log('Contexto salvo com sucesso na API')
      } else {
        throw new Error('Erro ao salvar contexto')
      }
      
    } catch (error) {
      console.error('Erro ao salvar contexto:', error)
      // Em produção, mostrar toast de erro
    }
  }, [consultationId])

  // Debounced save para evitar muitas chamadas
  const debouncedSave = useCallback(
    debounce((contextData: PatientContext) => {
      saveContext(contextData)
    }, 3000), // 3 segundos
    [saveContext]
  )

  // Atualizar contexto
  const updateContext = useCallback((newContext: Partial<PatientContext>) => {
    const updatedContext = {
      ...context,
      ...newContext
    }
    
    setContext(updatedContext)
    isDirty.current = true
    
    // Agendar salvamento
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave(updatedContext)
    }, 3000)
  }, [context, debouncedSave])

  // Adicionar anexo
  const addAttachment = useCallback((file: File) => {
    const attachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date()
    }
    
    updateContext({
      attachments: [...context.attachments, attachment]
    })
  }, [updateContext, context.attachments])

  // Remover anexo
  const removeAttachment = useCallback((attachmentId: string) => {
    updateContext({
      attachments: context.attachments.filter(att => att.id !== attachmentId)
    })
  }, [updateContext, context.attachments])

  // Salvar imediatamente
  const saveNow = useCallback(() => {
    if (isDirty.current) {
      saveContext(context)
    }
  }, [saveContext, context])

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    context,
    updateContext,
    addAttachment,
    removeAttachment,
    saveNow,
    isDirty: isDirty.current,
    lastSaved: context.lastSaved
  }
}
