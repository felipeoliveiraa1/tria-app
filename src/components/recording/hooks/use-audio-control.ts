import { useCallback, useRef, useState } from 'react'

interface AudioControlConfig {
  deviceId?: string
  silenceThreshold?: number
  chunkDuration?: number
}

export function useAudioControl() {
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')

  // Listar dispositivos de áudio
  const loadDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = deviceList.filter(device => device.kind === 'audioinput')
      setDevices(audioInputs)
      
      // Selecionar o primeiro dispositivo se nenhum estiver selecionado
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId)
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error)
    }
  }, [selectedDevice])

  // Analisar nível de áudio para detectar silêncio
  const analyzeAudioLevel = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return

    try {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any)
      
      let sum = 0
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i]
      }
      
      const average = sum / dataArrayRef.current.length
      setAudioLevel(average)
      
      return average
    } catch (error) {
      console.warn('Erro ao analisar nível de áudio:', error)
      return 0
    }
  }, [])

  // Iniciar captura de áudio com dispositivo específico
  const startAudioCapture = useCallback(async (config: AudioControlConfig = {}) => {
    try {
      console.log('🎤 Iniciando captura de áudio...')
      
      // Parar qualquer stream anterior
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: config.deviceId || selectedDevice ? { exact: config.deviceId || selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      }

      console.log('📱 Configurações de áudio:', constraints)
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      // Log das tracks do stream
      const audioTracks = stream.getAudioTracks()
      console.log('🎵 Tracks de áudio:', audioTracks.map(track => ({
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      })))

      // Configurar análise de áudio
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength) as any

      // Iniciar monitoramento de nível
      const monitorInterval = setInterval(analyzeAudioLevel, 100)
      intervalRef.current = monitorInterval

      setIsRecording(true)
      console.log('✅ Captura de áudio iniciada com sucesso')
      
      return stream
    } catch (error) {
      console.error('❌ Erro ao iniciar captura de áudio:', error)
      throw error
    }
  }, [selectedDevice, analyzeAudioLevel])

  // Parar captura de áudio
  const stopAudioCapture = useCallback(() => {
    console.log('⏹️ Parando captura de áudio...')
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    setIsRecording(false)
    setAudioLevel(0)
    console.log('✅ Captura de áudio parada')
  }, [])

  // Criar MediaRecorder para chunks
  const createRecorder = useCallback((stream: MediaStream, onDataAvailable: (blob: Blob) => void) => {
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          onDataAvailable(blob)
          chunks.length = 0 // Limpar chunks
        }
      }
      
      mediaRecorderRef.current = recorder
      return recorder
    } catch (error) {
      console.error('Erro ao criar MediaRecorder:', error)
      throw error
    }
  }, [])

  // Verificar se há áudio sendo captado (não está em silêncio)
  const hasAudioActivity = useCallback((threshold: number = 30) => {
    return audioLevel > threshold
  }, [audioLevel])

  return {
    // Estado
    isRecording,
    audioLevel,
    devices,
    selectedDevice,
    
    // Funções
    loadDevices,
    setSelectedDevice,
    startAudioCapture,
    stopAudioCapture,
    createRecorder,
    hasAudioActivity,
    
    // Refs para acesso direto se necessário
    streamRef,
    audioContextRef,
    analyserRef
  }
}
