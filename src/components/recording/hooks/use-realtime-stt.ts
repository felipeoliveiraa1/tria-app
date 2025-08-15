import { useEffect, useRef, useCallback, useState } from 'react'
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
  const [isClient, setIsClient] = useState(false)
  
  const { 
    addPartialText, 
    addFinalSegment, 
    setRealtimeConnected
  } = useRecordingStore()

  // Verificar se estamos no cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Verificar se o navegador suporta Web Speech API
  const isSupported = () => {
    if (!isClient) return false
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }

  // Obter a classe de reconhecimento disponível
  const getSpeechRecognition = () => {
    if (!isClient) return null
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
      console.log('🎤 STT: Tentando conectar...')
      console.log('🎤 STT: isClient:', isClient)
      console.log('🎤 STT: isSupported:', isSupported())
      
      if (!isSupported()) {
        console.warn('❌ STT: Web Speech API não suportada neste navegador')
        setRealtimeConnected(false)
        return
      }

      // Verificar se já está conectado
      if (isConnected.current) {
        console.log('🔄 STT: Já conectado, desconectando primeiro...')
        disconnect()
      }

      const SpeechRecognitionClass = getSpeechRecognition()
      console.log('🎤 STT: SpeechRecognitionClass encontrado:', !!SpeechRecognitionClass)
      
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

      console.log('🎤 STT: Configurações aplicadas - continuous:', recognition.continuous, 'interimResults:', recognition.interimResults, 'lang:', recognition.lang)

      // Eventos
      recognition.onstart = (event: Event) => {
        console.log('✅ STT: Reconhecimento de fala iniciado com sucesso')
        isConnected.current = true
        setRealtimeConnected(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('🎤 STT: Evento onresult recebido:', event)
        
        let finalTranscript = ''
        let interimTranscript = ''

        // Processar todos os resultados
        const resultsLength = Object.keys(event.results).length
        for (let i = 0; i < resultsLength; i++) {
          const result = event.results[i]
          if (result && result[0]) {
            const transcript = result[0].transcript
            console.log(`🎤 STT: Resultado ${i}: "${transcript}" (final: ${result.isFinal})`)
            
            if (result.isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript + ' '
            }
          }
        }

        // Atualizar texto parcial
        if (interimTranscript.trim()) {
          console.log('🎤 STT: Texto parcial:', interimTranscript.trim())
          addPartialText(interimTranscript.trim())
        }

        // Adicionar segmento final
        if (finalTranscript.trim()) {
          console.log('🎤 STT: Texto final:', finalTranscript.trim())
          addFinalSegment({
            text: finalTranscript.trim(),
            startMs: Date.now() - 2000, // Estimativa
            endMs: Date.now(),
            confidence: 0.9,
            isPartial: false
          })
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ STT: Erro no reconhecimento de fala:', event.error)
        
        // Não desconectar automaticamente para erros menores
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          console.log('🔄 STT: Erro menor, tentando reconectar...')
          // Tentar reconectar após um breve delay
          setTimeout(() => {
            if (isConnected.current && recognitionRef.current) {
              try {
                recognitionRef.current.start()
                console.log('🔄 STT: Reconexão bem-sucedida')
              } catch (error) {
                console.error('❌ STT: Falha na reconexão:', error)
              }
            }
          }, 1000)
        } else {
          // Para erros graves, desconectar
          setRealtimeConnected(false)
          isConnected.current = false
        }
      }

      recognition.onend = (event: Event) => {
        console.log('🔄 STT: Reconhecimento de fala finalizado')
        
        // Tentar reconectar automaticamente se ainda estiver gravando
        if (isConnected.current) {
          console.log('🔄 STT: Tentando reconectar automaticamente...')
          setTimeout(() => {
            if (isConnected.current && recognitionRef.current) {
              try {
                recognitionRef.current.start()
                console.log('🔄 STT: Reconexão automática bem-sucedida')
              } catch (error) {
                console.error('❌ STT: Falha na reconexão automática:', error)
                setRealtimeConnected(false)
                isConnected.current = false
              }
            }
          }, 500)
        } else {
          setRealtimeConnected(false)
        }
      }

      // Iniciar reconhecimento
      console.log('🎤 STT: Iniciando reconhecimento...')
      recognition.start()
      
    } catch (error) {
      console.error('❌ STT: Erro ao conectar:', error)
      setRealtimeConnected(false)
    }
  }, [addPartialText, addFinalSegment, setRealtimeConnected])

  // Desconectar
  const disconnect = useCallback(() => {
    console.log('🎤 STT: Desconectando...')
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        recognitionRef.current = null
        console.log('✅ STT: Reconhecimento parado com sucesso')
      } catch (error) {
        console.warn('⚠️ STT: Erro ao parar reconhecimento:', error)
      }
    }
    
    isConnected.current = false
    setRealtimeConnected(false)
    console.log('✅ STT: Desconectado com sucesso')
  }, [setRealtimeConnected])

  // Finalizar transcrição
  const finalize = useCallback(() => {
    if (isConnected.current) {
      console.log('🎤 STT: Finalizando transcrição')
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
