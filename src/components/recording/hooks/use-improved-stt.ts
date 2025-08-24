import { useCallback, useRef, useState } from 'react'
import { useRecordingStore } from '../store/recording-store'
import { useAudioControl } from './use-audio-control'

export function useImprovedSTT() {
  const [isConnected, setIsConnected] = useState(false)
  const [useOpenAI, setUseOpenAI] = useState(false)
  const processingRef = useRef(false)
  const lastChunkTime = useRef(0)
  
  const { 
    addPartialText, 
    addFinalSegment, 
    setRealtimeConnected 
  } = useRecordingStore()
  
  const audioControl = useAudioControl()

  // Verificar se OpenAI está disponível
  const checkOpenAI = useCallback(async () => {
    try {
      const response = await fetch('/api/anamnese/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptChunk: 'teste' })
      })
      const data = await response.json()
      const hasOpenAI = !data.mock
      console.log('🔍 OpenAI disponível:', hasOpenAI)
      setUseOpenAI(hasOpenAI)
      return hasOpenAI
    } catch (error) {
      console.warn('Erro ao verificar OpenAI, usando Web Speech API')
      setUseOpenAI(false)
      return false
    }
  }, [])

  // Transcrever com OpenAI
  const transcribeWithOpenAI = useCallback(async (audioBlob: Blob) => {
    if (processingRef.current || audioBlob.size < 1000) {
      console.log('⏭️ Pular chunk muito pequeno ou já processando')
      return
    }

    try {
      processingRef.current = true
      console.log('🔄 Enviando para OpenAI:', audioBlob.size, 'bytes')
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.text && data.text.trim().length > 0 && !data.mock && !data.filtered) {
          console.log('✅ Transcrição OpenAI:', data.text)
          addFinalSegment({
            text: data.text.trim(),
            startMs: Date.now(),
            endMs: Date.now() + 1000,
            confidence: 0.9,
            isPartial: false
          })
        } else if (data.filtered) {
          console.warn('⚠️ Transcrição filtrada')
        }
      }
    } catch (error) {
      console.error('❌ Erro na transcrição OpenAI:', error)
    } finally {
      processingRef.current = false
    }
  }, [addFinalSegment])

  // Conectar transcrição
  const connect = useCallback(async () => {
    try {
      console.log('🔗 Conectando transcrição...')
      
      // Carregar dispositivos e verificar OpenAI
      await audioControl.loadDevices()
      const shouldUseOpenAI = await checkOpenAI()
      
      // Iniciar captura de áudio
      const stream = await audioControl.startAudioCapture()
      
      if (shouldUseOpenAI) {
        console.log('🤖 Usando OpenAI Whisper')
        
        // Configurar gravação em chunks
        const recorder = audioControl.createRecorder(stream, (blob) => {
          // Só processar se há atividade de áudio
          if (audioControl.hasAudioActivity(25)) {
            const now = Date.now()
            if (now - lastChunkTime.current > 2000) { // Mínimo 2s entre chunks
              lastChunkTime.current = now
              transcribeWithOpenAI(blob)
            }
          } else {
            console.log('🔇 Sem atividade de áudio, pular chunk')
          }
        })
        
        // Iniciar gravação em chunks de 4 segundos
        recorder.start()
        const interval = setInterval(() => {
          if (recorder.state === 'recording') {
            recorder.stop()
            setTimeout(() => {
              if (recorder.state === 'inactive') {
                recorder.start()
              }
            }, 300)
          }
        }, 4000)
        
        // Cleanup
        return () => {
          clearInterval(interval)
          if (recorder.state !== 'inactive') {
            recorder.stop()
          }
        }
      } else {
        console.log('🎤 Usando Web Speech API')
        
        // Fallback para Web Speech API
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
          throw new Error('Speech Recognition não suportado')
        }
        
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'pt-BR'
        recognition.maxAlternatives = 1
        
        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
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
            
            // Filtros básicos
            const invalidPatterns = [
              /дякую|спасибо|thank you|share.*video.*social.*media/i,
              /^[\s\p{P}]*$/u,
              /[^\p{L}\p{N}\p{P}\p{Z}\s]/u
            ]
            
            const isValid = !invalidPatterns.some(pattern => pattern.test(cleanText)) && 
                           cleanText.length < 200
            
            if (isValid) {
              console.log('✅ Transcrição Web Speech:', cleanText)
              addFinalSegment({
                text: cleanText,
                startMs: Date.now() - 2000,
                endMs: Date.now(),
                confidence: 0.8,
                isPartial: false
              })
            }
          }
        }
        
        recognition.onerror = (event: any) => {
          console.error('❌ Erro Speech Recognition:', event.error)
        }
        
        recognition.start()
        
        return () => {
          recognition.stop()
        }
      }
    } catch (error) {
      console.error('❌ Erro ao conectar transcrição:', error)
      setRealtimeConnected(false)
      throw error
    }
  }, [audioControl, checkOpenAI, transcribeWithOpenAI, addPartialText, addFinalSegment, setRealtimeConnected])

  // Desconectar
  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando transcrição...')
    audioControl.stopAudioCapture()
    setIsConnected(false)
    setRealtimeConnected(false)
  }, [audioControl, setRealtimeConnected])

  return {
    connect,
    disconnect,
    isConnected,
    useOpenAI,
    audioLevel: audioControl.audioLevel,
    devices: audioControl.devices,
    selectedDevice: audioControl.selectedDevice,
    setSelectedDevice: audioControl.setSelectedDevice,
    isSupported: () => typeof window !== 'undefined' && 
                      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  }
}
