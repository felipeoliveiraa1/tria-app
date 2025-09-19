import { useState, useEffect, useRef, useCallback } from 'react'

// Definir tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  readonly isFinal: boolean
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface WebSpeechAPIHook {
  isSupported: boolean
  isListening: boolean
  isConnecting: boolean
  isConnected: boolean
  transcript: string
  finalTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
  setLanguage: (lang: string) => void
  setContinuous: (continuous: boolean) => void
  setInterimResults: (interim: boolean) => void
}

export function useWebSpeechAPI(): WebSpeechAPIHook {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState('pt-BR')
  const [continuous, setContinuous] = useState(true)
  const [interimResults, setInterimResults] = useState(true)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')

  // Verificar suporte à Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      recognitionRef.current = new SpeechRecognition()
      
      // Configurar reconhecimento
      const recognition = recognitionRef.current
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = language
      recognition.maxAlternatives = 1

      // Event listeners
      recognition.onstart = () => {
        console.log('🎤 Web Speech API iniciada')
        setIsListening(true)
        setIsConnecting(false)
        setIsConnected(true)
        setError(null)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let finalTranscript = finalTranscriptRef.current

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        finalTranscriptRef.current = finalTranscript
        setFinalTranscript(finalTranscript.trim())
        setTranscript(interimTranscript)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Erro na Web Speech API:', event.error, event.message)
        setError(`${event.error}: ${event.message}`)
        setIsListening(false)
        setIsConnected(false)
      }

      recognition.onend = () => {
        console.log('🔇 Web Speech API finalizada')
        setIsListening(false)
        setIsConnected(false)
      }

    } else {
      console.warn('⚠️ Web Speech API não suportada neste navegador')
      setIsSupported(false)
      setError('Web Speech API não suportada neste navegador')
    }
  }, [language, continuous, interimResults])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return

    try {
      console.log('🎤 Iniciando Web Speech API...')
      setIsConnecting(true)
      setError(null)
      recognitionRef.current.start()
    } catch (err) {
      console.error('❌ Erro ao iniciar reconhecimento:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setIsConnecting(false)
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return

    try {
      console.log('🔇 Parando Web Speech API...')
      recognitionRef.current.stop()
    } catch (err) {
      console.error('❌ Erro ao parar reconhecimento:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }, [isListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setFinalTranscript('')
    finalTranscriptRef.current = ''
  }, [])

  const handleSetLanguage = useCallback((lang: string) => {
    setLanguage(lang)
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang
    }
  }, [])

  const handleSetContinuous = useCallback((cont: boolean) => {
    setContinuous(cont)
    if (recognitionRef.current) {
      recognitionRef.current.continuous = cont
    }
  }, [])

  const handleSetInterimResults = useCallback((interim: boolean) => {
    setInterimResults(interim)
    if (recognitionRef.current) {
      recognitionRef.current.interimResults = interim
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    isConnecting,
    isConnected,
    transcript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    setLanguage: handleSetLanguage,
    setContinuous: handleSetContinuous,
    setInterimResults: handleSetInterimResults
  }
}
