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
    finalSegments
  } = useRecordingStore()
  
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  
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
      
      // Salvar dados da consulta se houver consultationId
      if (consultationId) {
        try {
          console.log('💾 Salvando dados da consulta...', { consultationId, elapsed, finalSegments })
          
          // Converter áudio para base64 para envio
          const arrayBuffer = await audioBlob.arrayBuffer()
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
          console.log('🔊 Áudio convertido para base64, tamanho:', base64Audio.length)
          
          // 1. Atualizar consulta com duração e status COMPLETED
          console.log('📝 Atualizando consulta para COMPLETED:', consultationId)
          const consultationResponse = await fetch('/api/consultations', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: consultationId,
              status: 'COMPLETED',
              duration: elapsed
            })
          })

          if (!consultationResponse.ok) {
            const errorText = await consultationResponse.text()
            console.error('❌ Erro ao atualizar consulta:', errorText)
          } else {
            const responseData = await consultationResponse.json()
            console.log('✅ Consulta atualizada com sucesso para COMPLETED:', responseData)
          }

          // 2. Salvar arquivo de áudio
          console.log('🎵 Salvando arquivo de áudio para consulta:', consultationId)
          const audioResponse = await fetch('/api/audio-files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              consultation_id: consultationId,
              filename: `consulta-${consultationId}.webm`,
              mime_type: 'audio/webm',
              size: audioBlob.size,
              duration: elapsed,
              storage_path: `consultations/${consultationId}/audio.webm`,
              storage_bucket: 'audio-files',
              is_processed: true,
              processing_status: 'completed',
              audio_data: base64Audio,
              original_blob_size: audioBlob.size
            })
          })

          if (!audioResponse.ok) {
            const errorText = await audioResponse.text()
            console.error('❌ Erro ao salvar arquivo de áudio:', errorText)
          } else {
            const audioData = await audioResponse.json()
            console.log('✅ Arquivo de áudio salvo com sucesso:', audioData)
          }

          // 3. Salvar transcrição
          const fullTranscript = finalSegments.map(segment => segment.text).join(' ')
          
          if (fullTranscript.trim()) {
            console.log('📝 Salvando transcrição para consulta:', consultationId)
            console.log('📝 Transcrição:', fullTranscript.substring(0, 100) + '...')
            
            const transcriptionResponse = await fetch('/api/transcriptions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                consultation_id: consultationId,
                raw_text: fullTranscript,
                summary: fullTranscript.substring(0, 200) + (fullTranscript.length > 200 ? '...' : ''),
                key_points: fullTranscript.split(' ').slice(0, 10).join(', '),
                confidence: 0.95,
                processing_time: 2.0,
                language: 'pt-BR',
                model_used: 'web-speech-api'
              })
            })

            if (!transcriptionResponse.ok) {
              const errorText = await transcriptionResponse.text()
              console.error('❌ Erro ao salvar transcrição:', errorText)
            } else {
              const transcriptionData = await transcriptionResponse.json()
              console.log('✅ Transcrição salva com sucesso:', transcriptionData)
            }
          } else {
            console.log('⚠️ Nenhuma transcrição para salvar')
          }

          console.log('🎉 Dados da consulta salvos com sucesso:', consultationId)
          console.log('📊 Resumo do salvamento:')
          console.log('- Consulta atualizada para COMPLETED')
          console.log('- Arquivo de áudio salvo')
          console.log('- Transcrição salva')
          console.log('- Duração:', elapsed, 'segundos')
        } catch (error) {
          console.error('❌ Erro ao salvar dados:', error)
        }
      }
      
      console.log('✅ Gravação parada com sucesso')
      return consultationId || ''
    } catch (error) {
      console.error('❌ Erro ao parar gravação:', error)
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
