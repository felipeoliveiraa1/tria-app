import { useCallback, useEffect, useRef, useState } from 'react'
import { useRecordingStore } from '../store/recording-store'
import { useRecordingSetupStore } from '../store/recording-setup-store'

export const useRecorder = () => {
  const {
    status,
    elapsed,
    level,
    consultationId,
    updateAudioLevel,
    setRealtimeConnected,
    finalSegments,
    saveConsultationData
  } = useRecordingStore()
  
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stoppingRef = useRef(false)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<any>(null)

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
          // @ts-ignore Compatibilidade de tipos do Web Audio API no TS atual
          analyserRef.current.getByteFrequencyData(dataArrayRef.current)
          
          const average = (dataArrayRef.current as Uint8Array).reduce((a: number, b: number) => a + b, 0) / bufferLength
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
      }
      
      recorder.onstop = () => {
        setIsRecording(false)
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
  }, [setupAudioAnalysis])



  // Parar gravação
  const stopRecording = useCallback(async () => {
    if (!mediaRecorder || !isRecording) {
      return consultationId || ''
    }

    try {
      if (stoppingRef.current) {
        console.log('⏳ Parada já em andamento; ignorando chamada duplicada')
        return consultationId || ''
      }
      stoppingRef.current = true
      console.log('🔄 Parando gravação...')

      // Preparar listener de parada ANTES de chamar stop()
      const stopped = new Promise<void>((resolve) => {
        const onStopped = () => resolve()
        try {
          // @ts-ignore - MediaRecorder suporta addEventListener
          mediaRecorder.addEventListener('stop', onStopped, { once: true })
        } catch {
          // Fallback
          // @ts-ignore
          mediaRecorder.onstop = onStopped
        }
        // Timeout de segurança
        setTimeout(() => resolve(), 2000)
      })

      // Parar a gravação (gera evento 'stop')
      try { mediaRecorder.stop() } catch {}
      
      // Aguardar finalização do recorder
      await stopped

      // Processar o áudio capturado
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      console.log('🎵 Gravação finalizada, áudio capturado:', audioBlob.size, 'bytes')
      
      // Salvar via store centralizado (faz PUT/POST e lida com headers)
      if (consultationId) {
        try {
          const ok = await saveConsultationData(audioBlob)
          if (!ok) console.error('❌ Falha ao salvar dados da consulta')
          else console.log('🎉 Dados da consulta salvos com sucesso')
        } catch (error) {
          console.error('❌ Erro ao salvar dados:', error)
        }
      }
      
      console.log('✅ Gravação parada com sucesso')
      stoppingRef.current = false
      return consultationId || ''
    } catch (error) {
      console.error('❌ Erro ao parar gravação:', error)
      stoppingRef.current = false
      return consultationId || ''
    }
  }, [mediaRecorder, isRecording, stream, audioChunks, consultationId, elapsed, finalSegments])

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
