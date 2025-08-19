"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Select, SelectItem } from "@/components/ui/select"
import { 
  User, 
  Calendar, 
  Clock, 
  Mic, 
  Headphones, 
  FileAudio, 
  Activity, 
  Heart, 
  Stethoscope,
  FileText,
  Download,
  X,
  Plus,
  CalendarDays,
  FileAudio2,
  MessageSquare
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Patient {
  id: string
  name: string
  email: string
  phone: string
  city: string
  status: "active" | "inactive"
  doctor_id: string
  created_at?: string
  updated_at?: string
}

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
  consultation_id?: string
  raw_text: string
  summary: string
  confidence: number
  processing_time: number
  created_at: string
}

interface AudioFile {
  id: string
  filename: string
  size: number
  duration: number | null
  mime_type: string
  uploaded_at: string
}

interface PatientDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient | null
  initialConsultationId?: string
}

export function PatientDetailsModal({ open, onOpenChange, patient, initialConsultationId }: PatientDetailsModalProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(initialConsultationId ?? null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Carregar dados do paciente quando o modal abrir
  useEffect(() => {
    if (open && patient) {
      loadPatientData()
    }
  }, [open, patient])

  useEffect(() => {
    if (!selectedConsultationId && consultations.length > 0) {
      setSelectedConsultationId(consultations[0].id)
    }
  }, [consultations, selectedConsultationId])

  // Garantir que o áudio pare/atualize ao trocar de ficha/consulta
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    try {
      el.pause()
      el.src = selectedConsultationId ? `/api/audio-files/stream?consultation_id=${selectedConsultationId}` : ''
      if (selectedConsultationId) el.load()
    } catch {}
  }, [selectedConsultationId, patient?.id, open])

  useEffect(() => {
    return () => {
      const el = audioRef.current
      try { if (el) { el.pause(); el.src = '' } } catch {}
    }
  }, [])

  const loadPatientData = async () => {
    if (!patient) return
    
    setIsLoading(true)
    try {
      console.log('Carregando dados do paciente:', patient.id, 'consulta inicial:', initialConsultationId)

      let selectedConsultations: Consultation[] = []
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const headers: Record<string, string> = { 'cache-control': 'no-store' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      if (initialConsultationId) {
        // Buscar apenas a consulta selecionada
        const byId = await fetch(`/api/consultations/${initialConsultationId}`, { cache: 'no-store', headers })
        if (byId.ok) {
          const d = await byId.json()
          if (d?.consultation) selectedConsultations = [d.consultation]
        }
      }

      if (selectedConsultations.length === 0) {
        // Fallback: buscar todas as consultas do paciente
        const consultationsResponse = await fetch(`/api/consultations?patient_id=${patient.id}`, { cache: 'no-store', headers })
        if (consultationsResponse.ok) {
          const consultationsData = await consultationsResponse.json()
          selectedConsultations = consultationsData.consultations || []
        }
      }

      setConsultations(selectedConsultations)
      if (!selectedConsultationId && selectedConsultations.length > 0) {
        setSelectedConsultationId(selectedConsultations[0].id)
      }

      // Buscar transcrições e arquivos de áudio para cada consulta
      const allTranscriptions: Transcription[] = []
      const allAudioFiles: AudioFile[] = []

      for (const consultation of selectedConsultations) {
        try {
          // Buscar transcrição usando a API correta
          const transcriptionResponse = await fetch(`/api/transcriptions?consultation_id=${consultation.id}`, { cache: 'no-store', headers })
          if (transcriptionResponse.ok) {
            const transcriptionData = await transcriptionResponse.json()
            console.log('Transcrições para consulta', consultation.id, ':', transcriptionData)
            if (transcriptionData.transcriptions && transcriptionData.transcriptions.length > 0) {
              allTranscriptions.push(...transcriptionData.transcriptions)
            }
          } else {
            console.log('Transcrição não encontrada para consulta:', consultation.id)
          }
        } catch (error) {
          console.log('Erro ao buscar transcrição para consulta:', consultation.id, error)
        }

        try {
          // Buscar arquivo de áudio usando a API correta
          const audioResponse = await fetch(`/api/audio-files?consultation_id=${consultation.id}`, { cache: 'no-store', headers })
          if (audioResponse.ok) {
            const audioData = await audioResponse.json()
            console.log('Arquivos de áudio para consulta', consultation.id, ':', audioData)
            if (audioData.audioFiles && audioData.audioFiles.length > 0) {
              allAudioFiles.push(...audioData.audioFiles)
            }
          } else {
            console.log('Arquivo de áudio não encontrado para consulta:', consultation.id)
          }
        } catch (error) {
          console.log('Erro ao buscar arquivo de áudio para consulta:', consultation.id, error)
        }
      }

      console.log('Total de transcrições encontradas:', allTranscriptions.length)
      console.log('Total de arquivos de áudio encontrados:', allAudioFiles.length)
      
      setTranscriptions(allTranscriptions)
      setAudioFiles(allAudioFiles)
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleDownloadTranscription = (transcription: Transcription) => {
    const blob = new Blob([transcription.raw_text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcricao-${transcription.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadAudio = (audioFile: AudioFile) => {
    // Em produção, fazer download real do arquivo
    console.log('Download do áudio:', audioFile.filename)
    // TODO: Implementar download real
  }

  if (!patient) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center space-x-3">
              <User className="h-8 w-8 text-primary" />
              <span>Ficha Técnica - {patient.name}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Informações do Paciente */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-primary">
                  <User className="h-6 w-6" />
                  <span>Dados do Paciente</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                      <p className="text-lg font-semibold">{patient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-lg">{patient.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                      <p className="text-lg">{patient.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cidade</p>
                      <p className="text-lg">{patient.city}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                        {patient.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Data de Cadastro</p>
                      <p className="text-lg">{patient.created_at ? new Date(patient.created_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Última Atualização</p>
                      <p className="text-lg">{patient.updated_at ? new Date(patient.updated_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Estatístico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Resumo Estatístico</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{consultations.length}</p>
                    <p className="text-sm text-muted-foreground">Total de Consultas</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{transcriptions.length}</p>
                    <p className="text-sm text-muted-foreground">Transcrições</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <FileAudio2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{audioFiles.length}</p>
                    <p className="text-sm text-muted-foreground">Arquivos de Áudio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Áudio da Consulta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileAudio className="h-5 w-5" />
                  <span>Áudio da Consulta</span>
                </CardTitle>
                <CardDescription>Reprodução direta do áudio vinculado à consulta</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedConsultationId ? (
                  <audio
                    ref={audioRef}
                    controls
                    className="w-full"
                    src={`/api/audio-files/stream?consultation_id=${selectedConsultationId}`}
                  >
                    Seu navegador não suporta a reprodução de áudio.
                  </audio>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma consulta selecionada para reprodução.</p>
                )}
              </CardContent>
            </Card>

            {/* Contexto Clínico da Consulta */}
            {(() => {
              const current = consultations.find(c => c.id === (selectedConsultationId || '')) || consultations[0]
              if (!current?.patient_context) return null
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Stethoscope className="h-5 w-5" />
                      <span>Contexto Clínico</span>
                    </CardTitle>
                    <CardDescription>Informações clínicas registradas durante a consulta</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded border max-h-80 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{current.patient_context}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Transcrição da Consulta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Transcrição</span>
                </CardTitle>
                <CardDescription>Texto processado da consulta selecionada</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const current = transcriptions.find(t => t.consultation_id === (selectedConsultationId || '')) || transcriptions[0]
                  if (!current) return (
                    <p className="text-sm text-muted-foreground">Nenhuma transcrição disponível.</p>
                  )
                  return (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                        <span>Confiança: {(current.confidence * 100).toFixed(1)}%</span>
                        {current.processing_time ? <span>Processamento: {current.processing_time}s</span> : null}
                        {current.language ? <span>Idioma: {current.language}</span> : null}
                      </div>
                      <div className="bg-muted p-3 rounded border max-h-80 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{current.raw_text}</p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consultas (removida) */}
          {/* <TabsContent value="consultations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Histórico de Consultas</span>
                  <Badge variant="secondary">{consultations.length} consultas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {consultations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consultations.map((consultation) => (
                      <div key={consultation.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Mic className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">Consulta #{consultation.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(consultation.created_at).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(consultation.created_at).toLocaleTimeString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={consultation.status === 'COMPLETED' ? 'default' : 'secondary'}>
                              {consultation.status}
                            </Badge>
                            <Badge variant="outline">
                              {consultation.consultation_type}
                            </Badge>
                          </div>
                        </div>
                        
                        {consultation.patient_context && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Contexto:</p>
                            <p className="text-sm bg-muted p-2 rounded">{consultation.patient_context}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Duração: {formatDuration(consultation.duration)}</span>
                          <span>ID: {consultation.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* Transcrições (removida) */}
          {/* <TabsContent value="transcriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Transcrições das Consultas</span>
                  <Badge variant="secondary">{transcriptions.length} transcrições</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transcriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma transcrição encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transcriptions.map((transcription) => (
                      <div key={transcription.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-semibold">Transcrição #{transcription.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transcription.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadTranscription(transcription)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">Confiança</p>
                            <p className="text-lg font-semibold">{(transcription.confidence * 100).toFixed(1)}%</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">Processamento</p>
                            <p className="text-lg font-semibold">{transcription.processing_time}s</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                            <p className="text-sm">{transcription.summary}</p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Texto:</p>
                          <div className="bg-muted p-3 rounded max-h-32 overflow-y-auto border">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {transcription.raw_text.length > 200 
                                ? `${transcription.raw_text.substring(0, 200)}...` 
                                : transcription.raw_text
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* Arquivos de Áudio (mostrado dentro da Visão Geral via player acima) */}
          {/* <TabsContent value="audio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileAudio className="h-5 w-5" />
                  <span>Gravações de Áudio</span>
                  <Badge variant="secondary">{audioFiles.length} arquivos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedConsultationId && (
                    <audio controls src={`/api/audio-files/stream?consultation_id=${selectedConsultationId}`} className="w-full">
                      Seu navegador não suporta a reprodução de áudio.
                    </audio>
                  )}
                  <div className="space-y-4">
                    {audioFiles.map((audioFile) => (
                      <div key={audioFile.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Headphones className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{audioFile.filename}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(audioFile.uploaded_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAudio(audioFile)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">Tamanho</p>
                            <p className="text-lg font-semibold">{formatFileSize(audioFile.size)}</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">Duração</p>
                            <p className="text-lg font-semibold">{formatDuration(audioFile.duration)}</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">Formato</p>
                            <p className="text-sm font-mono">{audioFile.mime_type}</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-sm font-medium text-muted-foreground">ID</p>
                            <p className="text-xs font-mono">{audioFile.id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              // TODO: Redirecionar para nova consulta com este paciente
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
