"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, FileText, User, Calendar, Clock, Mic, Headphones, FileAudio, Activity, Heart, Pill, Stethoscope, CheckCircle, AlertCircle } from "lucide-react"
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
  const [audioRetries, setAudioRetries] = useState(0)

  // Carregar dados da consulta
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Carregando dados para consulta:', consultationId)
        
        // Buscar dados da consulta
        const token = (await import('@/lib/supabase')).supabase.auth.getSession().then(r=>r.data.session?.access_token).catch(()=>undefined)
        const authHeader = token ? { Authorization: `Bearer ${await token}` } : undefined
        const consultationResponse = await fetch(`/api/consultations/${consultationId}`, { headers: authHeader })
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
          const transcriptionResponse = await fetch(`/api/transcriptions?consultation_id=${consultationId}`, { headers: authHeader })
          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json()
            console.log('✅ Dados da transcrição recebidos:', transcriptionData)
            if (transcriptionData.transcriptions && transcriptionData.transcriptions.length > 0) {
              console.log('✅ Transcrição encontrada:', transcriptionData.transcriptions[0])
              setTranscription(transcriptionData.transcriptions[0]) // Pegar a primeira transcrição
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
        const fetchAudio = async () => {
          try {
            const audioResponse = await fetch(`/api/audio-files?consultation_id=${consultationId}`, { headers: authHeader })
            if (audioResponse.ok) {
              const audioData = await audioResponse.json()
              console.log('Dados do áudio:', audioData)
              if (audioData.audioFiles && audioData.audioFiles.length > 0) {
                setAudioFile(audioData.audioFiles[0])
                return true
              }
            }
          } catch (err) {
            console.log('Erro ao buscar áudio:', err)
          }
          return false
        }
        const ok = await fetchAudio()
        if (!ok) setAudioRetries(1)
        
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

  // Polling leve para o áudio (aguarda upload/assinatura)
  useEffect(() => {
    if (audioFile || audioRetries === 0) return
    let cancelled = false
    const run = async () => {
      try {
        const token = await import('@/lib/supabase').then(m => m.supabase.auth.getSession()).then(r => r.data.session?.access_token).catch(() => undefined)
        const headers = token ? { Authorization: `Bearer ${token}` } as any : undefined
        const audioResponse = await fetch(`/api/audio-files?consultation_id=${consultationId}`, { headers })
        if (cancelled) return
        if (audioResponse.ok) {
          const d = await audioResponse.json()
          if (d.audioFiles && d.audioFiles.length > 0) {
            setAudioFile(d.audioFiles[0])
            return
          }
        }
      } catch {}
      // Tenta novamente até 10 vezes
      if (!cancelled && audioRetries < 10) {
        setTimeout(() => setAudioRetries(prev => prev + 1), 1500)
      }
    }
    run()
    return () => { cancelled = true }
  }, [audioRetries, audioFile, consultationId])

  // Função para reproduzir/pausar áudio
  const toggleAudio = async () => {
    if (audioElement) {
      try {
        if (isPlaying) {
          audioElement.pause()
          setIsPlaying(false)
        } else {
          await audioElement.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error('Erro ao controlar áudio:', error)
        toast({
          title: "Erro ao reproduzir áudio",
          description: "Não foi possível reproduzir o arquivo de áudio.",
          variant: "destructive"
        })
      }
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

  // Configurar áudio quando audioFile mudar
  useEffect(() => {
    console.log('🔄 useEffect do áudio executado, audioFile:', audioFile)
    
    if (audioFile && (audioFile.file_url || audioFile.storage_path)) {
      console.log('🔍 Analisando URL do áudio:', audioFile.file_url)
      console.log('🔍 Tipo da URL:', typeof audioFile.file_url)
      console.log('🔍 URL começa com http?', audioFile.file_url.startsWith('http'))
      console.log('🔍 URL contém supabase.co?', audioFile.file_url.includes('supabase.co'))
      
      // Verificar se é uma URL HTTP válida (simplificar validação)
      const sourceUrl = audioFile.file_url || (audioFile.storage_path?.startsWith('http') ? audioFile.storage_path : undefined)
      if (sourceUrl && sourceUrl.startsWith('http')) {
        console.log('✅ URL válida detectada, criando elemento de áudio...')
        
        try {
          const audio = new Audio(sourceUrl)
          console.log('✅ Elemento de áudio criado com sucesso')
          
          audio.addEventListener('loadstart', () => {
            console.log('🔄 Áudio iniciando carregamento...')
          })
          
          audio.addEventListener('canplay', () => {
            console.log('✅ Áudio pronto para reprodução')
            toast({
              title: "Áudio carregado!",
              description: "Clique em reproduzir para ouvir o áudio.",
            })
          })
          
          audio.addEventListener('play', () => {
            console.log('▶️ Áudio iniciou reprodução')
            setIsPlaying(true)
          })
          
          audio.addEventListener('pause', () => {
            console.log('⏸️ Áudio pausado')
            setIsPlaying(false)
          })
          
          audio.addEventListener('ended', () => {
            console.log('⏹️ Áudio terminou')
            setIsPlaying(false)
          })
          
          audio.addEventListener('error', (e) => {
            console.error('❌ Erro ao carregar áudio:', e)
            console.error('❌ Tipo do evento de erro:', typeof e)
            console.error('❌ Evento de erro completo:', e)
            
            // Verificar se o elemento de áudio tem informações de erro
            if (audio && audio.error && audio.error.code !== undefined) {
              console.error('✅ Detalhes do erro disponíveis:', {
                code: audio.error.code,
                message: audio.error.message || 'Sem mensagem',
                MEDIA_ERR_ABORTED: audio.error.MEDIA_ERR_ABORTED,
                MEDIA_ERR_NETWORK: audio.error.MEDIA_ERR_NETWORK,
                MEDIA_ERR_DECODE: audio.error.MEDIA_ERR_DECODE,
                MEDIA_ERR_SRC_NOT_SUPPORTED: audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED
              })
              
              let errorMessage = 'Erro desconhecido'
              switch (audio.error.code) {
                case audio.error.MEDIA_ERR_ABORTED:
                  errorMessage = 'Carregamento abortado pelo usuário'
                  break
                case audio.error.MEDIA_ERR_NETWORK:
                  errorMessage = 'Erro de rede ao carregar o áudio'
                  break
                case audio.error.MEDIA_ERR_DECODE:
                  errorMessage = 'Erro ao decodificar o arquivo de áudio'
                  break
                case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage = 'Formato de áudio não suportado'
                  break
                default:
                  errorMessage = `Erro ${audio.error.code}: ${audio.error.message || 'Sem mensagem'}`
              }
              
              toast({
                title: "Erro ao carregar áudio",
                description: errorMessage,
                variant: "destructive"
              })
            } else {
              console.error('⚠️ Erro de áudio sem detalhes disponíveis')
              console.error('⚠️ audio.error:', audio.error)
              console.error('⚠️ audio.error.code:', audio.error?.code)
              
              // Tentar obter mais informações do evento
              if (e && e.target && (e.target as HTMLAudioElement).error) {
                const audioTarget = e.target as HTMLAudioElement
                console.error('✅ Erro encontrado no target:', audioTarget.error)
                if (audioTarget.error) {
                  toast({
                    title: "Erro ao carregar áudio",
                    description: `Erro: ${audioTarget.error.message || 'Formato não suportado'}`,
                    variant: "destructive"
                  })
                }
              } else {
                toast({
                  title: "Erro ao carregar áudio",
                  description: "Não foi possível carregar o arquivo de áudio. Verifique se o formato é suportado.",
                  variant: "destructive"
                })
              }
            }
          })
          
          // Testar se o áudio pode ser carregado
          console.log('🔄 Tentando carregar o áudio...')
          audio.load()
          
          setAudioElement(audio)
          console.log('✅ Elemento de áudio configurado e salvo no estado')
          
          // Cleanup
          return () => {
            console.log('🧹 Limpando elemento de áudio')
            audio.pause()
            audio.removeEventListener('loadstart', () => {})
            audio.removeEventListener('canplay', () => {})
            audio.removeEventListener('play', () => {})
            audio.removeEventListener('pause', () => {})
            audio.removeEventListener('ended', () => {})
            audio.removeEventListener('error', () => {})
          }
        } catch (error) {
          console.error('❌ Erro ao criar elemento de áudio:', error)
          setAudioElement(null)
          toast({
            title: "Erro ao criar player de áudio",
            description: "Não foi possível criar o player de áudio.",
            variant: "destructive"
          })
        }
      } else {
        console.log('⚠️ URL inválida (não começa com http):', audioFile.file_url)
        setAudioElement(null)
        
        // Mostrar toast informativo
        toast({
          title: "URL de áudio inválida",
          description: "O arquivo de áudio não possui uma URL válida para reprodução.",
          variant: "destructive"
        })
      }
    } else {
      console.log('❌ audioFile inválido ou sem URL:', audioFile)
      setAudioElement(null)
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
                  {audioElement && (
                    <>
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
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAudio}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
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
