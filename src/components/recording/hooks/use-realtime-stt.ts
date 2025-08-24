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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const isConnected = useRef(false)
  const audioChunksRef = useRef<Blob[]>([])
  const [useOpenAI, setUseOpenAI] = useState(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { 
    addPartialText, 
    addFinalSegment, 
    setRealtimeConnected,
    setRealtimeReconnecting,
    consultationId 
  } = useRecordingStore()



  // Verificar se o navegador suporta Web Speech API
  const isSupported = () => {
    // Verificação SSR-safe para Next.js
    if (typeof window === 'undefined') return false
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }

  // Obter a classe de reconhecimento disponível
  const getSpeechRecognition = () => {
    // Verificação SSR-safe para Next.js
    if (typeof window === 'undefined') return null
    if ('webkitSpeechRecognition' in window) {
      return (window as any).webkitSpeechRecognition
    }
    if ('SpeechRecognition' in window) {
      return (window as any).SpeechRecognition
    }
    return null
  }

  // Verificar se deve usar OpenAI
  const checkOpenAI = useCallback(async () => {
    try {
      // Testar diretamente se a chave funciona
      const testResponse = await fetch('/api/anamnese/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptChunk: 'teste' })
      })
      const testData = await testResponse.json()
      const hasOpenAI = !testData.mock
      console.log('OpenAI disponível:', hasOpenAI, testData.message)
      setUseOpenAI(hasOpenAI)
      return hasOpenAI
    } catch (error) {
      console.warn('Erro ao verificar OpenAI, usando Web Speech API')
      setUseOpenAI(false)
      return false
    }
  }, [])

  // Função para transcrever com OpenAI
  const transcribeWithOpenAI = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.text && data.text.trim().length > 0 && !data.mock && !data.filtered) {
          console.log('✅ Transcrição OpenAI válida:', data.text)
          addFinalSegment({
            text: data.text.trim(),
            startMs: Date.now(),
            endMs: Date.now() + 1000,
            confidence: 0.9,
            isPartial: false
          })
        } else if (data.filtered) {
          console.warn('⚠️ Transcrição filtrada por conteúdo inválido')
        }
      }
    } catch (error) {
      console.error('Erro na transcrição OpenAI:', error)
    }
  }, [addFinalSegment])

  // Conectar ao serviço de STT - SIMPLES E FUNCIONAL
  const connect = useCallback(async () => {
    try {
      // Evitar múltiplas conexões
      if (isConnected.current) {
        console.log('⚠️ STT já está conectado, ignorando...')
        return
      }
      
      console.log('🎙️ Iniciando Web Speech API simples...')
      
      if (!isSupported()) {
        console.warn('Web Speech API não suportada')
        setRealtimeConnected(false)
        return
      }

      // Primeiro, verificar dispositivos disponíveis e solicitar permissão
      try {
        console.log('🔍 Verificando dispositivos de áudio disponíveis...')
        
        // Listar dispositivos disponíveis
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(device => device.kind === 'audioinput')
        
        console.log('🎤 Dispositivos de áudio encontrados:', audioInputs.length)
        audioInputs.forEach((device, index) => {
          console.log(`  ${index + 1}. ${device.label || 'Microfone ' + (index + 1)}`)
        })
        
        if (audioInputs.length === 0) {
          throw new Error('Nenhum dispositivo de entrada de áudio encontrado')
        }
        
        console.log('🎤 Solicitando permissão de microfone...')
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true 
        })
        console.log('✅ Permissão de microfone concedida')
        
        // Parar o stream imediatamente - só precisávamos da permissão
        stream.getTracks().forEach(track => track.stop())
      } catch (permError) {
        console.error('❌ Erro ao acessar microfone:', permError)
        setRealtimeConnected(false)
        
        // Mostrar erro específico para o usuário
        if (permError instanceof Error) {
          if (permError.name === 'NotAllowedError') {
            alert('Por favor, permita o acesso ao microfone para usar a transcrição.')
          } else if (permError.name === 'NotFoundError') {
            alert('Nenhum microfone foi encontrado. Verifique se um microfone está conectado.')
          } else {
            alert('Erro ao acessar o microfone: ' + permError.message)
          }
        } else {
          alert('Erro ao acessar o microfone: ' + String(permError))
        }
        return
      }

      const SpeechRecognitionClass = getSpeechRecognition()
      if (!SpeechRecognitionClass) {
        throw new Error('SpeechRecognition não disponível')
      }

      const recognition = new SpeechRecognitionClass()
      recognitionRef.current = recognition

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'pt-BR'
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        console.log('✅ Web Speech ativo')
        isConnected.current = true
        setRealtimeConnected(true)
        setRealtimeReconnecting(false)
        // Reset retry count quando conexão for bem-sucedida
        retryCountRef.current = 0
        // Limpar timeout de retry pendente
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
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

        if (interimTranscript) {
          addPartialText(interimTranscript)
        }

        if (finalTranscript && finalTranscript.trim().length > 0) {
          const cleanText = finalTranscript.trim()
          console.log('📝 Transcrição:', cleanText)
          
          addFinalSegment({
            text: cleanText,
            startMs: Date.now() - 2000,
            endMs: Date.now(),
            confidence: 0.8,
            isPartial: false
          })
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Usar log apropriado baseado no tipo de erro
        if (event.error === 'network') {
          console.warn('⚠️ Problema de rede detectado:', event.error)
        } else {
          console.error('❌ Erro Web Speech:', event.error)
        }
        
        // Tratar diferentes tipos de erro
        switch (event.error) {
          case 'not-allowed':
            console.error('Permissão de microfone negada')
            alert('Permissão de microfone negada. Por favor, permita o acesso ao microfone.')
            setRealtimeConnected(false)
            isConnected.current = false
            retryCountRef.current = 0 // Reset retry count
            break
            
          case 'audio-capture':
            console.error('Falha na captura de áudio')
            alert('Falha ao capturar áudio do microfone. Verifique se o microfone está funcionando.')
            setRealtimeConnected(false)
            isConnected.current = false
            retryCountRef.current = 0 // Reset retry count
            break
            
          case 'network':
            console.warn('⚠️ Erro de rede na transcrição - tentando reconectar...')
            setRealtimeConnected(false)
            isConnected.current = false
            // Não resetar retryCount aqui - deixar o sistema tentar reconectar
            attemptReconnect(2000)
            return // Não mostrar alert nem fazer mais processamento
            
          case 'no-speech':
            console.warn('⚠️ Nenhuma fala detectada')
            // Não mostrar alerta para este caso
            return // Não desconectar
            
          case 'aborted':
            console.warn('⚠️ Transcrição interrompida pelo usuário')
            return // Não desconectar
            
          case 'service-not-allowed':
            console.error('Serviço de reconhecimento não permitido')
            alert('Serviço de reconhecimento de voz não disponível. Tente novamente mais tarde.')
            setRealtimeConnected(false)
            isConnected.current = false
            retryCountRef.current = 0
            break
            
          default:
            console.error('Erro desconhecido na transcrição:', event.error)
            // Para erros desconhecidos, tentar reconectar uma vez
            if (retryCountRef.current === 0) {
              console.log('🔄 Tentando reconectar após erro desconhecido...')
              attemptReconnect(3000)
            } else {
              alert('Erro na transcrição: ' + event.error)
              setRealtimeConnected(false)
              isConnected.current = false
            }
        }
      }

      recognition.onend = () => {
        console.log('Web Speech encerrou')
        // NÃO reiniciar automaticamente - evitar loops
        setRealtimeConnected(false)
        isConnected.current = false
      }

      recognition.start()
      
    } catch (error) {
      console.error('Erro ao conectar:', error)
      setRealtimeConnected(false)
    }
  }, [addPartialText, addFinalSegment, setRealtimeConnected])

  // Função para tentar reconectar após erro
  const attemptReconnect = useCallback((delay: number = 2000) => {
    if (retryCountRef.current >= maxRetries) {
      console.error('❌ Máximo de tentativas de reconexão atingido')
      setRealtimeConnected(false)
      setRealtimeReconnecting(false)
      return
    }

    retryCountRef.current += 1
    console.log(`🔄 Tentando reconectar... (${retryCountRef.current}/${maxRetries})`)
    setRealtimeReconnecting(true)
    
    retryTimeoutRef.current = setTimeout(() => {
      try {
        // Limpar estado anterior
        if (recognitionRef.current) {
          recognitionRef.current.stop()
          recognitionRef.current = null
        }
        
        // Tentar conectar novamente
        connect()
      } catch (error) {
        console.error('Erro na tentativa de reconexão:', error)
        attemptReconnect(delay * 2) // Backoff exponencial
      }
    }, delay)
  }, [connect, setRealtimeReconnecting])

  // Desconectar
  const disconnect = useCallback(() => {
    // Parar Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        recognitionRef.current = null
      } catch (error) {
        console.warn('Erro ao parar reconhecimento:', error)
      }
    }
    
    // Parar MediaRecorder (OpenAI)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
        mediaRecorderRef.current = null
      } catch (error) {
        console.warn('Erro ao parar gravação:', error)
      }
    }
    
    // Limpar timeout de retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    // Reset contador de retry
    retryCountRef.current = 0
    
    isConnected.current = false
    setRealtimeConnected(false)
    setRealtimeReconnecting(false)
    console.log('✅ STT completamente desconectado')
  }, [setRealtimeConnected, setRealtimeReconnecting])

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
    isSupported
  }
}
