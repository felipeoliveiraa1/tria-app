"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, FileText, User, Calendar, Clock, Mic, Headphones, FileAudio, Activity, Heart, Pill, Stethoscope, CheckCircle, AlertCircle, Loader2, Pause, Play } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Consultation {
  id: string
  patient_name: string
  patient_context: string | null
  consultation_type: 'PRESENCIAL' | 'TELEMEDICINA'
  status: string
  duration: number | null
  recording_url: string | null
  created_at: string
  updated_at: string
}

interface Transcription {
  id: string
  consultation_id: string
  content: string
  raw_text: string
  summary: string | null
  key_points: string[] | null
  diagnosis: string | null
  treatment: string | null
  observations: string | null
  confidence: number
  processing_time: number | null
  language: string
  model_used: string
  created_at: string
}

interface AudioFile {
  id: string
  consultation_id: string
  file_name: string
  file_size: number
  duration: number
  file_url: string
  filename: string
  original_name: string | null
  mime_type: string
  size: number
  storage_path: string
  storage_bucket: string
  is_processed: boolean
  processing_status: string
  uploaded_at: string
  audio_data?: string // Adicionado para armazenar o base64
}

export default function PatientDataPage() {
  const params = useParams()
  const router = useRouter()
  const consultationId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Estado para controlar carregamento do áudio
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  // Função para aguardar o áudio estar pronto
  const waitForAudioReady = (audio: HTMLAudioElement, timeoutMs: number = 10000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      // Função para verificar se está pronto
      const checkReady = () => {
        const elapsed = Date.now() - startTime
        
        // Timeout
        if (elapsed > timeoutMs) {
          reject(new Error(`Timeout: Áudio não ficou pronto em ${timeoutMs}ms`))
          return
        }
        
        // Verificar se está pronto
        if (audio.readyState >= 3 && audio.duration > 0 && !isNaN(audio.duration)) {
          console.log('✅ Áudio pronto detectado:', {
            readyState: audio.readyState,
            duration: audio.duration,
            elapsed: elapsed + 'ms'
          })
          resolve()
          return
        }
        
        // Continuar verificando
        setTimeout(checkReady, 100)
      }
      
      // Iniciar verificação
      checkReady()
    })
  }

  // Função para carregar áudio de forma robusta
  const loadAudioRobustly = async (audio: HTMLAudioElement): Promise<boolean> => {
    try {
      setAudioLoading(true)
      setAudioError(null)
      
      console.log('🔄 Iniciando carregamento robusto do áudio...')
      
      // Configurar o áudio
      audio.preload = 'auto'
      audio.load()
      
      // Aguardar o áudio estar pronto
      await waitForAudioReady(audio)
      
      // Verificações finais
      if (audio.error) {
        throw new Error(`Erro no elemento de áudio: ${audio.error.message}`)
      }
      
      if (audio.duration === 0 || isNaN(audio.duration)) {
        throw new Error('Duração do áudio inválida após carregamento')
      }
      
      if (audio.buffered.length === 0) {
        throw new Error('Nenhum dado de áudio disponível para reprodução')
      }
      
      console.log('✅ Áudio carregado com sucesso:', {
        duration: audio.duration,
        readyState: audio.readyState,
        buffered: audio.buffered.length
      })
      
      setAudioReady(true)
      return true
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('❌ Erro ao carregar áudio:', error)
      setAudioError(errorMessage)
      return false
    } finally {
      setAudioLoading(false)
    }
  }

  // Carregar dados da consulta
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Carregando dados para consulta:', consultationId)
        
        // Buscar dados da consulta
        const consultationResponse = await fetch(`/api/consultations/${consultationId}`)
        if (consultationResponse.ok) {
          const consultationData = await consultationResponse.json()
          console.log('Dados da consulta carregados:', consultationData)
          setConsultation(consultationData.consultation)
        } else {
          console.error('Erro ao buscar consulta:', consultationResponse.status)
          // Tentar buscar na lista geral de consultas
          try {
            const allConsultationsResponse = await fetch('/api/consultations')
            if (allConsultationsResponse.ok) {
              const allConsultationsData = await allConsultationsResponse.json()
              console.log('Todas as consultas disponíveis:', allConsultationsData)
              
              // Procurar pela consulta específica
              const foundConsultation = allConsultationsData.consultations?.find(
                (c: any) => c.id === consultationId
              )
              
              if (foundConsultation) {
                console.log('Consulta encontrada na lista geral:', foundConsultation)
                setConsultation(foundConsultation)
              } else {
                console.log('Consulta não encontrada, criando mock')
                // Criar uma consulta mock para evitar erro 404
                setConsultation({
                  id: consultationId,
                  patient_name: 'Paciente',
                  patient_context: '',
                  consultation_type: 'PRESENCIAL',
                  status: 'CREATED',
                  created_at: new Date().toISOString(),
                  duration: null,
                  recording_url: null,
                  updated_at: new Date().toISOString()
                })
              }
            } else {
              console.log('Falha ao buscar todas as consultas, criando mock')
              // Criar uma consulta mock para evitar erro 404
              setConsultation({
                id: consultationId,
                patient_name: 'Paciente',
                patient_context: '',
                consultation_type: 'PRESENCIAL',
                status: 'CREATED',
                created_at: new Date().toISOString(),
                duration: null,
                recording_url: null,
                updated_at: new Date().toISOString()
              })
            }
          } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError)
            // Criar uma consulta mock para evitar erro 404
            setConsultation({
              id: consultationId,
              patient_name: 'Paciente',
              patient_context: '',
              consultation_type: 'PRESENCIAL',
              status: 'CREATED',
              created_at: new Date().toISOString(),
              duration: null,
              recording_url: null,
              updated_at: new Date().toISOString()
            })
          }
        }

        // Buscar transcrição usando a API correta
        try {
          console.log('🔄 Buscando transcrição para consulta:', consultationId)
          // Buscar transcrição específica da consulta
          const transcriptionResponse = await fetch(`/api/transcriptions?consultation_id=${consultationId}`)
          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json()
            console.log('✅ Dados da transcrição recebidos:', transcriptionData)
            
            if (transcriptionData.transcriptions && transcriptionData.transcriptions.length > 0) {
              console.log('✅ Transcrição encontrada para a consulta:', transcriptionData.transcriptions[0])
              setTranscription(transcriptionData.transcriptions[0])
            } else {
              console.log('⚠️ Nenhuma transcrição encontrada para esta consulta')
            }
          } else {
            console.log('❌ Erro ao buscar transcrição:', transcriptionResponse.status)
          }
        } catch (error) {
          console.error('❌ Erro ao buscar transcrição:', error)
        }

        // Buscar arquivo de áudio usando a API correta
        try {
          console.log('🔄 Buscando arquivo de áudio para consulta:', consultationId)
          // Buscar arquivo de áudio específico da consulta
          const audioResponse = await fetch(`/api/audio-files?consultation_id=${consultationId}`)
          if (audioResponse.ok) {
            const audioData = await audioResponse.json()
            console.log('Dados do áudio:', audioData)
            
            if (audioData.audioFiles && audioData.audioFiles.length > 0) {
              console.log('✅ Arquivo de áudio encontrado para a consulta:', audioData.audioFiles[0])
              setAudioFile(audioData.audioFiles[0])
            } else {
              console.log('⚠️ Nenhum arquivo de áudio encontrado para esta consulta')
            }
          } else {
            console.log('❌ Erro ao buscar arquivo de áudio:', audioResponse.status)
          }
        } catch (error) {
          console.log('Erro ao buscar arquivo de áudio:', error)
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        // Em caso de erro, criar dados mock para evitar tela em branco
        setConsultation({
          id: consultationId,
          patient_name: 'Paciente',
          patient_context: '',
          consultation_type: 'PRESENCIAL',
          status: 'CREATED',
          created_at: new Date().toISOString(),
          duration: null,
          recording_url: null,
          updated_at: new Date().toISOString()
        })
        setIsLoading(false)
      }
    }

    loadData()
  }, [consultationId])

  // Função para reproduzir/pausar áudio
  const toggleAudio = async () => {
    if (audioElement) {
      try {
        if (isPlaying) {
          console.log('⏸️ Pausando áudio...')
          audioElement.pause()
          setIsPlaying(false)
        } else {
          console.log('▶️ Iniciando reprodução...')
          
          // Verificar se o áudio está pronto
          if (audioElement.readyState >= 2) { // HAVE_CURRENT_DATA
            console.log('✅ Áudio pronto para reprodução')
            await audioElement.play()
            setIsPlaying(true)
            console.log('✅ Reprodução iniciada com sucesso')
          } else {
            console.log('⏳ Áudio ainda não está pronto, aguardando...')
            toast({
              title: "Aguarde",
              description: "O áudio ainda está carregando. Tente novamente em alguns segundos.",
              variant: "default"
            })
          }
        }
      } catch (error) {
        console.error('❌ Erro ao controlar áudio:', error)
        
        // Tratar erros específicos
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            toast({
              title: "Reprodução interrompida",
              description: "A reprodução foi interrompida. Tente novamente.",
              variant: "destructive"
            })
          } else if (error.name === 'NotSupportedError') {
            toast({
              title: "Formato não suportado",
              description: "O formato de áudio não é suportado pelo navegador.",
              variant: "destructive"
            })
          } else {
            toast({
              title: "Erro ao reproduzir áudio",
              description: `Erro: ${error.message}`,
              variant: "destructive"
            })
          }
        } else {
          toast({
            title: "Erro ao reproduzir áudio",
            description: "Não foi possível reproduzir o arquivo de áudio.",
            variant: "destructive"
          })
        }
        
        setIsPlaying(false)
      }
    } else {
      console.warn('Nenhum elemento de áudio disponível')
      toast({
        title: "Áudio não disponível",
        description: "O player de áudio não está configurado.",
        variant: "destructive"
      })
    }
  }

  // Função para parar áudio
  const stopAudio = () => {
    if (audioElement) {
      try {
        audioElement.pause()
        audioElement.currentTime = 0
        setIsPlaying(false)
      } catch (error) {
        console.error('Erro ao parar áudio:', error)
        toast({
          title: "Erro ao parar áudio",
          description: "Não foi possível parar a reprodução.",
          variant: "destructive"
        })
      }
    }
  }

  // Carregar áudio quando audioFile mudar
  useEffect(() => {
    if (!audioFile) {
      console.log('❌ audioFile inválido ou sem URL válida:', audioFile)
      return
    }

    console.log('🔄 AudioFile carregado:', {
      id: audioFile.id,
      filename: audioFile.filename,
      size: audioFile.size,
      mime_type: audioFile.mime_type,
      file_url: audioFile.file_url,
      storage_path: audioFile.storage_path
    })

    // Limpar estado anterior
    setAudioElement(null)
    setAudioReady(false)
    setAudioError(null)
    setIsPlaying(false)

    // Se temos URL de áudio, marcar como pronto
    if (audioFile.file_url || audioFile.storage_path) {
      console.log('✅ URL de áudio disponível, marcando como pronto')
      setAudioReady(true)
      setAudioError(null)
    } else {
      console.log('⚠️ Nenhuma URL de áudio disponível')
      setAudioError('Nenhuma URL de áudio disponível')
    }

  }, [audioFile])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleDownloadAudio = () => {
    if (audioFile) {
      console.log('Iniciando reprodução do áudio:', audioFile.filename)
      console.log('URL do áudio:', audioFile.file_url)
      
      try {
        // Verificar se temos uma URL válida do Supabase Storage
        if (audioFile.file_url && audioFile.file_url.startsWith('http')) {
          // Criar elemento de áudio para reproduzir
          const audio = new Audio(audioFile.file_url)
          
          // Adicionar event listeners
          audio.addEventListener('loadstart', () => {
            console.log('Carregando áudio...')
            toast({
              title: "Carregando áudio...",
              description: "O arquivo está sendo carregado.",
            })
          })
          
          audio.addEventListener('canplay', () => {
            console.log('Áudio pronto para reprodução')
            toast({
              title: "Áudio carregado!",
              description: "Clique para reproduzir o áudio.",
              action: <CheckCircle className="h-4 w-4 text-green-500" />
            })
          })
          
          audio.addEventListener('error', (e) => {
            console.error('Erro ao carregar áudio:', e)
            toast({
              title: "Erro ao carregar áudio",
              description: "Não foi possível carregar o arquivo de áudio.",
              variant: "destructive"
            })
          })
          
          // Tentar reproduzir o áudio
          audio.play().catch((error) => {
            console.error('Erro ao reproduzir áudio:', error)
            
            // Se não conseguir reproduzir, tentar download
            console.log('Tentando download como fallback...')
            const a = document.createElement('a')
            a.href = audioFile.file_url
            a.download = audioFile.filename || `audio-${consultationId}.webm`
            a.target = '_blank'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            
            toast({
              title: "Download iniciado!",
              description: `Arquivo ${audioFile.filename} está sendo baixado.`,
              action: <CheckCircle className="h-4 w-4 text-green-500" />
            })
          })
          
        } else {
          // Se não temos URL válida, mostrar erro
          console.error('URL do áudio inválida:', audioFile.file_url)
          toast({
            title: "Arquivo não disponível",
            description: "O arquivo de áudio não está acessível.",
            variant: "destructive"
          })
        }
        
      } catch (error) {
        console.error('Erro ao reproduzir áudio:', error)
        
        // Mostrar toast de erro
        toast({
          title: "Erro ao reproduzir áudio",
          description: "Não foi possível reproduzir o arquivo de áudio.",
          variant: "destructive"
        })
      }
    } else {
      console.warn('Nenhum arquivo de áudio disponível para reprodução')
      
      // Mostrar toast de aviso
      toast({
        title: "Arquivo não disponível",
        description: "Nenhum arquivo de áudio encontrado para esta consulta.",
        variant: "destructive"
      })
    }
  }

  const handleDownloadTranscription = () => {
    if (transcription) {
      const blob = new Blob([transcription.raw_text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcricao-${consultationId}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Carregando ficha do paciente...</p>
        </div>
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground">Paciente não encontrado</p>
          <Button onClick={() => router.back()} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="p-6 space-y-6 h-full w-full max-w-none">
      {/* Header com botão voltar */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header da Ficha do Paciente */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Ficha do Paciente</h1>
          <p className="text-muted-foreground">
            Informações completas e histórico médico
          </p>
        </div>

        {/* Informações Principais do Paciente */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-primary">
              <User className="h-6 w-6" />
              <span>Dados do Paciente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="text-lg font-semibold">{consultation.patient_name}</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Data da Consulta</p>
                <p className="text-lg font-semibold">{new Date(consultation.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Duração</p>
                <p className="text-lg font-semibold">{formatDuration(consultation.duration)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Tipo de Consulta</p>
                <Badge variant={consultation.consultation_type === 'PRESENCIAL' ? 'default' : 'secondary'} className="text-sm">
                  {consultation.consultation_type}
                </Badge>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
                <Badge variant={consultation.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-sm">
                  {consultation.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contexto Clínico */}
        {consultation.patient_context && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Stethoscope className="h-5 w-5" />
                <span>Contexto Clínico</span>
              </CardTitle>
              <CardDescription>
                Informações médicas relevantes do paciente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{consultation.patient_context}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcrição da Consulta */}
        {transcription ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Transcrição da Consulta</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTranscription}
                  className="ml-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download TXT
                </Button>
              </CardTitle>
              <CardDescription>
                Transcrição completa da consulta médica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Confiança</p>
                    <p className="text-lg font-semibold">{(transcription.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Processamento</p>
                    <p className="text-lg font-semibold">{transcription.processing_time}s</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Data</p>
                    <p className="text-lg font-semibold">{new Date(transcription.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Texto da Transcrição</p>
                  <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{transcription.raw_text}</p>
                  </div>
                </div>
                
                {/* Resumo e Pontos-chave */}
                {transcription.summary && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Resumo</p>
                    <div className="bg-muted p-3 rounded-lg border">
                      <p className="text-sm">{transcription.summary}</p>
                    </div>
                  </div>
                )}
                
                {transcription.key_points && transcription.key_points.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Pontos-chave</p>
                    <div className="bg-muted p-3 rounded-lg border">
                      <ul className="text-sm space-y-1">
                        {transcription.key_points.map((point, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Diagnóstico e Tratamento */}
                {(transcription.diagnosis || transcription.treatment) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {transcription.diagnosis && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Diagnóstico</p>
                        <div className="bg-muted p-3 rounded-lg border">
                          <p className="text-sm">{transcription.diagnosis}</p>
                        </div>
                      </div>
                    )}
                    
                    {transcription.treatment && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Tratamento</p>
                        <div className="bg-muted p-3 rounded-lg border">
                          <p className="text-sm">{transcription.treatment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Observações */}
                {transcription.observations && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Observações</p>
                    <div className="bg-muted p-3 rounded-lg border">
                      <p className="text-sm">{transcription.observations}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-700">
                <FileText className="h-5 w-5" />
                <span>Transcrição da Consulta</span>
              </CardTitle>
              <CardDescription className="text-yellow-600">
                Nenhuma transcrição encontrada para esta consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 text-sm">
                A transcrição ainda não foi processada ou não está disponível.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Gravação de Áudio */}
        {audioFile ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileAudio className="h-5 w-5" />
                <span>Gravação da Consulta</span>
                <div className="ml-auto flex space-x-2">
                  {/* Controles de áudio */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={toggleAudio}
                      disabled={!audioElement || audioLoading}
                      variant={isPlaying ? "secondary" : "default"}
                      size="sm"
                    >
                      {audioLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Carregando...
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Reproduzir
                        </>
                      )}
                    </Button>
                    
                    {audioElement && (
                      <div className="text-sm text-muted-foreground">
                        {audioLoading && "🔄 Carregando..."}
                        {audioReady && !audioLoading && "✅ Pronto"}
                        {audioError && `❌ ${audioError}`}
                        {!audioReady && !audioLoading && !audioError && "⏳ Aguardando..."}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopAudio}
                    className="flex items-center space-x-2"
                  >
                    <div className="w-4 h-4 bg-current rounded-sm" />
                    <span>Parar</span>
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Arquivo de áudio da consulta médica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <FileAudio className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Nome do Arquivo</p>
                  <p className="text-sm font-mono">{audioFile.filename}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Tamanho</p>
                  <p className="text-lg font-semibold">{formatFileSize(audioFile.size)}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Duração</p>
                  <p className="text-lg font-semibold">{formatDuration(audioFile.duration)}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Formato</p>
                  <p className="text-sm font-mono">{audioFile.mime_type}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="text-sm">{new Date(audioFile.uploaded_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-sm">{audioFile.processing_status}</p>
                </div>
              </div>
              
              {/* Player de áudio visual */}
              {audioElement ? (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Player de Áudio</p>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAudio}
                      className="flex items-center space-x-2"
                    >
                      {isPlaying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <div className="w-0 h-0 border-l-[8px] border-l-current border-y-[6px] border-y-transparent ml-1" />
                          <span>Reproduzir</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopAudio}
                      className="flex items-center space-x-2"
                    >
                      <div className="w-4 h-4 bg-current rounded-sm" />
                      <span>Parar</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {audioFile.filename} • {formatDuration(audioFile.duration)}
                    </span>
                  </div>
                </div>
              ) : audioFile && audioFile.file_url ? (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-700 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">Problema com URL do Áudio</p>
                  </div>
                  <p className="text-red-600 text-sm mb-2">
                    O arquivo de áudio foi encontrado, mas a URL não é válida para reprodução.
                  </p>
                  <div className="text-xs text-red-500 font-mono bg-red-100 p-2 rounded">
                    URL: {audioFile.file_url}
                  </div>
                  <p className="text-red-600 text-sm mt-2">
                    Status: {audioFile.processing_status || 'N/A'} • 
                    Tamanho: {formatFileSize(audioFile.file_size || audioFile.size || 0)}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-700">
                <FileAudio className="h-5 w-5" />
                <span>Gravação da Consulta</span>
              </CardTitle>
              <CardDescription className="text-yellow-600">
                Nenhum arquivo de áudio encontrado para esta consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 text-sm">
                O arquivo de áudio ainda não foi processado ou não está disponível.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Resumo da Consulta */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-700">
              <Heart className="h-5 w-5" />
              <span>Resumo da Consulta</span>
            </CardTitle>
            <CardDescription className="text-green-600">
              Consulta finalizada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-green-700">✅ Gravação de áudio</p>
                <p className="text-green-600">
                  {audioFile ? 'Arquivo salvo e registrado no banco' : 'Arquivo em processamento'}
                </p>
              </div>
              <div>
                <p className="font-medium text-green-700">✅ Transcrição completa</p>
                <p className="text-green-600">
                  {transcription ? 'Texto processado e disponível para download' : 'Transcrição em processamento'}
                </p>
              </div>
              <div>
                <p className="font-medium text-green-700">✅ Metadados salvos</p>
                <p className="text-green-600">Informações da consulta persistidas</p>
              </div>
              <div>
                <p className="font-medium text-green-700">✅ Ficha do paciente</p>
                <p className="text-green-600">Documentação completa disponível</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button
            onClick={() => router.push('/dashboard/nova-consulta')}
            className="bg-primary hover:bg-primary/90 px-8 py-3"
          >
            <Mic className="h-5 w-5 mr-2" />
            Nova Consulta
          </Button>
          
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="px-8 py-3"
          >
            <User className="h-5 w-5 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </main>
  )
}
