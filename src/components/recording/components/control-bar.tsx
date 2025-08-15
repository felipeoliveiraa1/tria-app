import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRecordingStore } from '../store/recording-store'
import { useRecorder } from '../hooks/use-recorder'
import { useRealtimeSTT } from '../hooks/use-realtime-stt'
import { useRouter } from 'next/navigation'
import { Mic, Square, Pause, Play, RotateCcw } from 'lucide-react'

interface ControlBarProps {
  consultationId: string
}

export const ControlBar: React.FC<ControlBarProps> = ({ consultationId }) => {
  const router = useRouter()
  const [isRecording, setIsRecording] = useState(false)
  
  const {
    status,
    elapsed,
    consultationId: storeConsultationId,
    start,
    stop,
    pause,
    resume,
    reset,
    finalize,
    saveConsultationData
  } = useRecordingStore()

  // Usar o hook useRecorder para captura real de áudio
  const {
    startRecording,
    stopRecording,
    isRecording: isRecorderRecording,
    error
  } = useRecorder()

  // Usar o hook STT para transcrição
  const { connect: connectSTT, disconnect: disconnectSTT, isConnected: isSTTConnected } = useRealtimeSTT()

  // Sincronizar estado de gravação
  useEffect(() => {
    setIsRecording(isRecorderRecording)
  }, [isRecorderRecording])

  const handleStartRecording = async () => {
    try {
      console.log('🎬 Iniciando gravação para consulta:', consultationId)
      
      // Iniciar gravação real com MediaRecorder
      const success = await startRecording(consultationId)
      if (success) {
        // Iniciar no store também
        start(consultationId, 'default')
        console.log('✅ Gravação iniciada com sucesso')
      } else {
        console.error('❌ Falha ao iniciar gravação')
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error)
    }
  }

  const handleStopRecording = async () => {
    try {
      console.log('⏹️ Parando gravação...')
      
      // Parar gravação real e obter áudio capturado
      const audioBlob = await stopRecording()
      
      if (audioBlob && audioBlob.size > 0) {
        console.log('🎵 Áudio real capturado:', audioBlob.size, 'bytes')
        console.log('🎵 Tipo do áudio:', audioBlob.type)
        
        // Salvar dados da consulta usando o store
        const success = await saveConsultationData(audioBlob)
        
        if (success) {
          console.log('✅ Dados salvos com sucesso, parando gravação...')
          // Parar no store após salvar os dados
          stop()
          // Redirecionar para página de dados do paciente
          router.push(`/dashboard/patients/${consultationId}`)
        } else {
          console.error('❌ Falha ao salvar dados')
        }
      } else {
        console.error('❌ Nenhum áudio capturado')
      }
    } catch (error) {
      console.error('❌ Erro ao parar gravação:', error)
    }
  }

  const handleFinalizeConsultation = async () => {
    try {
      console.log('🏁 Finalizando consulta...')
      
      // Desconectar STT primeiro
      console.log('🎤 Desconectando STT...')
      disconnectSTT()
      
      // Aguardar um momento para o STT desconectar
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Parar gravação real se ainda estiver gravando
      if (isRecording) {
        const audioBlob = await stopRecording()
        
        if (audioBlob && audioBlob.size > 0) {
          console.log('🎵 Áudio real capturado:', audioBlob.size, 'bytes')
          
          // Salvar dados da consulta
          const success = await saveConsultationData(audioBlob)
          
          if (success) {
            console.log('✅ Dados salvos com sucesso, finalizando...')
            finalize()
            // Redirecionar para página de dados do paciente
            router.push(`/dashboard/patients/${consultationId}`)
          } else {
            console.error('❌ Falha ao salvar dados da consulta')
            finalize()
          }
        } else {
          console.error('❌ Nenhum áudio capturado ou áudio vazio')
          finalize()
        }
      } else {
        // Se não estava gravando, apenas finalizar
        console.log('ℹ️ Nenhuma gravação ativa, finalizando...')
        finalize()
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar consulta:', error)
      finalize()
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const isPaused = status === 'paused'
  const isFinished = status === 'finished'

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
      {/* Status e tempo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Status: <span className="font-medium">{status}</span>
          </div>
          {elapsed > 0 && (
            <div className="text-sm text-muted-foreground">
              Tempo: <span className="font-medium">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
        
        {/* Botão de teste para STT */}
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              console.log('🧪 Teste: Conectando STT manualmente...')
              connectSTT()
            }}
            className="text-xs"
          >
            🧪 Testar STT
          </Button>
          <div className="text-xs text-muted-foreground">
            STT: {isSTTConnected ? '✅ Conectado' : '❌ Desconectado'}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Status e tempo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse' : 
                isPaused ? 'bg-yellow-500' : 
                isFinished ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="font-mono text-lg">{formatTime(elapsed * 1000)}</span>
            </div>
            
            {/* Status do STT */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isSTTConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600">
                {isSTTConnected ? 'STT Ativo' : 'STT Inativo'}
              </span>
            </div>
            
            {/* Removed finalSegments and getTotalWords as they are not directly available from useRecorder */}
          </div>

          {/* Controles principais */}
          <div className="flex items-center space-x-3">
            {!isRecording && !isFinished && (
              <Button
                onClick={handleStartRecording}
                size="lg"
                className="bg-red-600 hover:bg-red-700"
              >
                <Mic className="h-5 w-5 mr-2" />
                Iniciar Gravação
              </Button>
            )}
            
            {isRecording && (
              <>
                <Button
                  onClick={pause}
                  variant="outline"
                  size="lg"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Pausar
                </Button>
                
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Parar Gravação
                </Button>
              </>
            )}
            
            {isPaused && (
              <>
                <Button
                  onClick={resume}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Continuar
                </Button>
                
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Parar Gravação
                </Button>
              </>
            )}
            
            {isFinished && (
              <>
                <Button
                  onClick={reset}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Nova Gravação
                </Button>
                
                <Button
                  onClick={handleFinalizeConsultation}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {/* Removed CheckCircle as it's not directly available from useRecorder */}
                  Finalizar Consulta
                </Button>
                
                <Button
                  onClick={() => router.push(`/dashboard/patients/${consultationId}`)}
                  variant="outline"
                  size="lg"
                >
                  {/* Removed User as it's not directly available from useRecorder */}
                  Ver Dados do Paciente
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

