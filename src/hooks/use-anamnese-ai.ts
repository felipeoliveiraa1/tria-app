'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AnamneseState, emptyState, Field } from '@/lib/anamnese-schema';
import { pushChunk } from '@/lib/anamnese-client';

interface UseAnamneseAiProps {
  consultationId?: string;
  initialState?: AnamneseState;
  onStateChange?: (state: AnamneseState) => void;
  onError?: (error: string) => void;
}

export function useAnamneseAi({
  consultationId,
  initialState,
  onStateChange,
  onError
}: UseAnamneseAiProps = {}) {
  const [state, setState] = useState<AnamneseState>(initialState ?? emptyState());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDeltas, setLastDeltas] = useState<Array<{ path: string; from: any; to: any }>>([]);
  
  // Buffer para acumular texto antes de enviar para a IA
  const transcriptBuffer = useRef<string>('');
  const lastProcessTime = useRef<number>(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<AnamneseState>(state);
  
  // Manter ref atualizada
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Processar trecho de transcrição com a IA
  const processTranscript = useCallback(async (chunk: string) => {
    if (!chunk.trim()) return;

    setIsProcessing(true);
    
    try {
      // Usar o estado atual da ref
      const currentState = stateRef.current;
      const response = await pushChunk(consultationId || '', chunk, currentState);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setState(response.state);
      setLastDeltas(response.deltas);
      onStateChange?.(response.state);
      
      // Anamnese atualizada
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao processar anamnese:', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [consultationId, onStateChange, onError]);

  // Adicionar texto ao buffer e processar quando necessário
  const addTranscriptChunk = useCallback((chunk: string, forceProcess = false) => {
    // Anamnese IA - recebendo chunk
    transcriptBuffer.current += ' ' + chunk;
    
    // Limpar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessTime.current;
    
    // Processar imediatamente se:
    // - forceProcess é true
    // - buffer tem mais de 100 caracteres
    // - passou mais de 5 segundos desde o último processamento
    if (forceProcess || 
        transcriptBuffer.current.length > 100 || 
        timeSinceLastProcess > 5000) {
      
      const textToProcess = transcriptBuffer.current.trim();
      if (textToProcess) {
        transcriptBuffer.current = '';
        lastProcessTime.current = now;
        processTranscript(textToProcess);
      }
    } else {
      // Agendar processamento em 2 segundos
      debounceTimer.current = setTimeout(() => {
        const textToProcess = transcriptBuffer.current.trim();
        if (textToProcess) {
          transcriptBuffer.current = '';
          lastProcessTime.current = Date.now();
          processTranscript(textToProcess);
        }
      }, 2000);
    }
  }, [processTranscript]);

  // Confirmar um campo manualmente
  const confirmField = useCallback((sectionKey: string, fieldKey: string) => {
    setState(prev => {
      const newState = structuredClone(prev);
      const section = (newState as any)[sectionKey];
      if (section && section[fieldKey]) {
        section[fieldKey].confirmed = true;
      }
      return newState;
    });
  }, []);

  // Editar um campo manualmente
  const updateField = useCallback((
    sectionKey: string, 
    fieldKey: string, 
    updates: Partial<Field>
  ) => {
    setState(prev => {
      const newState = structuredClone(prev);
      const section = (newState as any)[sectionKey];
      if (section) {
        section[fieldKey] = { ...section[fieldKey], ...updates };
      }
      return newState;
    });
  }, []);

  // Resetar estado
  const reset = useCallback(() => {
    setState(emptyState());
    transcriptBuffer.current = '';
    setLastDeltas([]);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Salvar estado atual no backend
  const saveToConsultation = useCallback(async () => {
    if (!consultationId) return;

    try {
      const response = await fetch('/api/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: consultationId,
          anamnese: state
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar';
      onError?.(errorMessage);
      throw error;
    }
  }, [consultationId, state, onError]);

  return {
    state,
    setState,
    isProcessing,
    lastDeltas,
    addTranscriptChunk,
    processTranscript,
    confirmField,
    updateField,
    reset,
    saveToConsultation,
    hasChanges: lastDeltas.length > 0
  };
}
