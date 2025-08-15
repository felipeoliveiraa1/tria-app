import { useEffect, useRef, useCallback } from 'react'
import { useRecordingStore } from '../store/recording-store'

// Tipos para Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string
      }
      isFinal: boolean
    }
  }
  length: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: (event: Event) => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onend: (event: Event) => void
  start: () => void
  stop: () => void
}

export const useRealtimeSTT = () => {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isConnected = useRef(false)
  
  const { 
    addPartialText, 
    addFinalSegment, 
    setRealtimeConnected,
    consultationId 
  } = useRecordingStore()

  // Verificar se o navegador suporta Web Speech API
  const isSupported = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }

  // Obter a classe de reconhecimento disponível
  const getSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      return (window as any).webkitSpeechRecognition
    }
    if ('SpeechRecognition' in window) {
      return (window as any).SpeechRecognition
    }
    return null
  }

  // Conectar ao serviço de STT
  const connect = useCallback(async () => {
    try {
      if (!isSupported()) {
        console.warn('Web Speech API não suportada neste navegador')
        setRealtimeConnected(false)
        return
      }

      const SpeechRecognitionClass = getSpeechRecognition()
      if (!SpeechRecognitionClass) {
        throw new Error('SpeechRecognition não disponível')
      }

      // Configurar reconhecimento de fala
      const recognition = new SpeechRecognitionClass()
      recognitionRef.current = recognition

      // Configurações
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'pt-BR'
      recognition.maxAlternatives = 1

      // Eventos
      recognition.onstart = (event: Event) => {
        console.log('Reconhecimento de fala iniciado')
        isConnected.current = true
        setRealtimeConnected(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // Atualizar texto parcial
        if (interimTranscript) {
          addPartialText(interimTranscript)
        }

        // Adicionar segmento final
        if (finalTranscript) {
          addFinalSegment({
            text: finalTranscript,
            startMs: Date.now() - 2000, // Estimativa
            endMs: Date.now(),
            confidence: 0.9,
            isPartial: false
          })
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Erro no reconhecimento de fala:', event.error)
        setRealtimeConnected(false)
        isConnected.current = false
      }

      recognition.onend = (event: Event) => {
        console.log('Reconhecimento de fala finalizado')
        setRealtimeConnected(false)
        isConnected.current = false
        
        // Reiniciar automaticamente se ainda estiver gravando
        if (isConnected.current) {
          recognition.start()
        }
      }

      // Iniciar reconhecimento
      recognition.start()
      
    } catch (error) {
      console.error('Erro ao conectar ao STT:', error)
      setRealtimeConnected(false)
    }
  }, [addPartialText, addFinalSegment, setRealtimeConnected])

  // Desconectar
  const disconnect = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        recognitionRef.current = null
      } catch (error) {
        console.warn('Erro ao parar reconhecimento:', error)
      }
    }
    
    isConnected.current = false
    setRealtimeConnected(false)
  }, [setRealtimeConnected])

  // Finalizar transcrição
  const finalize = useCallback(() => {
    if (isConnected.current) {
      console.log('Finalizando transcrição STT')
      disconnect()
    }
  }, [disconnect])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connect,
    disconnect,
    finalize,
    isConnected: isConnected.current,
    isSupported: isSupported()
  }
}
