import { useRecordingStore } from "../store/recording-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  RotateCcw, 
  CheckCircle,
  FileText,
  User,
  Clock
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useRecorder } from "../hooks/use-recorder"

interface ControlBarProps {
  consultationId: string
}

export function ControlBar({ consultationId }: ControlBarProps) {
  const router = useRouter()
  const {
    status,
    elapsed,
    start,
    stop: stopStore,
    pause,
    resume,
    reset,
    finalize,
    finalSegments,
    getTotalWords,
    saveConsultationData
  } = useRecordingStore()

  const {
    isRecording: isRec,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = useRecorder()

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      console.log('Iniciando gravação para consulta:', consultationId)
      
      // Iniciar estado visual e MediaRecorder real
      start(consultationId, 'default')
      await startRecording(consultationId)
      
      console.log('Gravação iniciada com sucesso')
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
    }
  }

  const handleStopRecording = async () => {
    try {
      console.log('Parando gravação...')
      // Parar MediaRecorder real e salvar via hooks
      const cid = await stopRecording()
      const success = !!cid
      
      if (success) {
        console.log('Dados salvos com sucesso, parando gravação...')
        // Parar no store após salvar os dados
        stopStore()
        // Redirecionar para página de dados do paciente
        router.push(`/dashboard/patients/${consultationId}`)
      } else {
        console.error('Falha ao salvar dados')
        // Parar no store mesmo com erro
        stopStore()
      }
    } catch (error) {
      console.error('Erro ao parar gravação:', error)
      // Parar no store em caso de erro
      stopStore()
    }
  }

  const handleFinalizeConsultation = async () => {
    try {
      console.log('Finalizando consulta...')
      // Parar MediaRecorder real e persistir
      const cid = await stopRecording()
      const success = !!cid
      
      if (success) {
        console.log('Consulta finalizada com sucesso, redirecionando...')
        // Finalizar no store após salvar os dados
        finalize()
        // Redirecionar para página de dados do paciente
        router.push(`/dashboard/patients/${consultationId}`)
      } else {
        console.error('Falha ao salvar dados da consulta')
        // Finalizar no store mesmo com erro
        finalize()
        // Mesmo com erro, tentar redirecionar
        router.push(`/dashboard/patients/${consultationId}`)
      }
    } catch (error) {
      console.error('Erro ao finalizar consulta:', error)
      // Finalizar no store em caso de erro
      finalize()
      // Em caso de erro, tentar redirecionar mesmo assim
      router.push(`/dashboard/patients/${consultationId}`)
    }
  }

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isFinished = status === 'finished'

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
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
              <Badge variant={isRecording ? 'destructive' : isPaused ? 'secondary' : 'default'}>
                {isRecording ? 'Gravando' : isPaused ? 'Pausado' : isFinished ? 'Finalizado' : 'Pronto'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-lg">{formatTime(elapsed * 1000)}</span>
            </div>
            
            {finalSegments.length > 0 && (
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {getTotalWords()} palavras
                </span>
              </div>
            )}
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
                  onClick={pauseRecording}
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
                  onClick={resumeRecording}
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
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Finalizar Consulta
                </Button>
                
                <Button
                  onClick={() => router.push(`/dashboard/patients/${consultationId}`)}
                  variant="outline"
                  size="lg"
                >
                  <User className="h-5 w-5 mr-2" />
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
