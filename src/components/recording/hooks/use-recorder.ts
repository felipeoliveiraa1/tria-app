import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecordingStore } from '../store/recording-store'
import { useRecordingSetupStore } from '../store/recording-setup-store'
import { useRealtimeSTT } from './use-realtime-stt'

export const useRecorder = () => {
  const {
    status,
    elapsed,
    level,
    consultationId,
    updateAudioLevel,
    setRealtimeConnected,
    finalSegments
  } = useRecordingStore()
  
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // Conectar com STT
  const { connect: connectSTT, disconnect: disconnectSTT } = useRealtimeSTT()

  const {
    patientId,
    context,
    mode
  } = useRecordingSetupStore()

  // Configurar análise de áudio
  const setupAudioAnalysis = useCallback(async (audioStream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(audioStream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)
      
      source.connect(analyserRef.current)
      
      const updateLevel = () => {
        if (analyserRef.current && dataArrayRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current)
          
          const average = dataArrayRef.current.reduce((a, b) => a + b) / bufferLength
          const level = (average / 255) * 100
          
          updateAudioLevel(level)
          requestAnimationFrame(updateLevel)
        }
      }
      
      updateLevel()
    } catch (error) {
      console.error('Erro ao configurar análise de áudio:', error)
    }
  }, [isRecording, updateAudioLevel])

  // Iniciar gravação
  const startRecording = useCallback(async (consultationId: string) => {
    try {
      setError(null)
      
      // Solicitar permissão de microfone
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      setStream(audioStream)
      
      // Configurar MediaRecorder
      const recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      setMediaRecorder(recorder)
      
      // Configurar eventos
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data])
        }
      }
      
      recorder.onstart = () => {
        setIsRecording(true)
        setAudioChunks([])
        setupAudioAnalysis(audioStream)
        
        // Conectar com STT para transcrição em tempo real
        console.log('🎤 Conectando com STT para transcrição...')
        connectSTT()
      }
      
      recorder.onstop = () => {
        setIsRecording(false)
        
        // Desconectar STT
        console.log('🎤 Desconectando STT...')
        disconnectSTT()
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            audioContextRef.current.close()
          } catch (error) {
            console.warn('AudioContext já estava fechado:', error)
          }
        }
      }
      
      recorder.onerror = (event) => {
        console.error('Erro no MediaRecorder:', event)
        setError('Erro ao gravar áudio')
      }
      
      // Iniciar gravação
      recorder.start(1000) // Coletar dados a cada 1 segundo
      
      return true
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      setError('Erro ao acessar microfone')
      return false
    }
  }, [setupAudioAnalysis, connectSTT, disconnectSTT])



  // Parar gravação
  const stopRecording = useCallback(async () => {
    if (!mediaRecorder || !isRecording) {
      return null
    }

    try {
      console.log('🔄 Parando gravação...')
      
      // Parar stream de áudio primeiro
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      // Parar a gravação
      mediaRecorder.stop()
      
      // Aguardar a finalização
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve()
      })

      // Processar o áudio capturado
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      console.log('🎵 Gravação finalizada, áudio capturado:', audioBlob.size, 'bytes')
      
      // Retornar o áudio capturado para o control-bar gerenciar
      return audioBlob
      
    } catch (error) {
      console.error('❌ Erro ao parar gravação:', error)
      setError('Erro ao parar gravação')
      return null
    }
  }, [mediaRecorder, isRecording, stream, audioChunks])

  // Pausar gravação
  const pauseRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.pause()
      setIsRecording(false)
    }
  }, [mediaRecorder, isRecording])

  // Retomar gravação
  const resumeRecording = useCallback(() => {
    if (mediaRecorder && !isRecording) {
      mediaRecorder.resume()
      setIsRecording(true)
    }
  }, [mediaRecorder, isRecording])

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close()
        } catch (error) {
          console.warn('AudioContext já estava fechado:', error)
        }
      }
    }
  }, [stream])

  return {
    isRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    level
  }
}
