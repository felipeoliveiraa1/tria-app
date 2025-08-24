"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { RecordingLayout } from "@/components/recording/components/recording-layout"
import { PatientContextPanel } from "@/components/recording/components/patient-context-panel"
import { LiveTranscriptPanel } from "@/components/recording/components/live-transcript-panel"
import { ControlBar } from "@/components/recording/components/control-bar"
import { ConsentGuard } from "@/components/recording/components/consent-guard"
import { TopActions } from "@/components/recording/components/top-actions"
import { useRecordingStore } from "@/components/recording/store/recording-store"
import { useRealtimeSTT } from "@/components/recording/hooks/use-realtime-stt"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, User, Calendar, Clock } from "lucide-react"
import { AnamneseAIPanel } from "@/components/consultations/AnamneseAIPanel"
import TabCaptureTranscriber from "@/components/telemed/TabCaptureTranscriber"

interface Consultation {
  id: string
  patient_name: string
  patient_context: string | null
  consultation_type: 'PRESENCIAL' | 'TELEMEDICINA'
  status: string
  created_at: string
  anamnese?: any
}

export default function RecordingPage() {
  const params = useParams()
  const router = useRouter()
  const consultationId = params.id as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const anamneseCallbackRef = useRef<((text: string) => void) | null>(null)
  const lastProcessedSegmentId = useRef<string | null>(null)
  
  const { 
    status, 
    reset, 
    setRealtimeConnected,
    consultationId: storeConsultationId,
    setConsultationId,
    finalSegments
  } = useRecordingStore()
  
  const { connect: connectSTT, isSupported } = useRealtimeSTT()

  // Definir consultationId no store quando a página carregar
  useEffect(() => {
    if (consultationId && consultationId !== storeConsultationId) {
      console.log('Definindo consultationId no store:', consultationId)
      setConsultationId(consultationId)
    }
  }, [consultationId, storeConsultationId, setConsultationId])

  // Carregar dados da consulta
  useEffect(() => {
    const loadConsultation = async () => {
      try {
        console.log('Carregando dados da consulta:', consultationId)
        
        // Buscar dados reais da API
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        const headers: Record<string, string> = { 'cache-control': 'no-store' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const response = await fetch(`/api/consultations/${consultationId}`, { headers })
        if (response.ok) {
          const data = await response.json()
          console.log('Dados da consulta carregados:', data)
          
          if (data.consultation) {
            setConsultation(data.consultation)
            console.log('Nome do paciente carregado:', data.consultation.patient_name)
          } else {
            console.log('Consulta não encontrada, usando fallback')
            setConsultation({
              id: consultationId,
              patient_name: "Paciente",
              patient_context: "",
              consultation_type: "PRESENCIAL",
              status: "CREATED",
              created_at: new Date().toISOString()
            })
          }
        } else {
          console.log('Falha ao carregar consulta, usando fallback', response.status)
          // Fallback para dados mockados se a API não estiver disponível
          setConsultation({
            id: consultationId,
            patient_name: "Paciente",
            patient_context: "",
            consultation_type: "PRESENCIAL",
            status: "CREATED",
            created_at: new Date().toISOString()
          })
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Erro ao carregar consulta:', error)
        // Fallback para dados mockados
        setConsultation({
          id: consultationId,
          patient_name: "Paciente",
          patient_context: "",
          consultation_type: "PRESENCIAL",
          status: "CREATED",
          created_at: new Date().toISOString()
        })
        setIsLoading(false)
      }
    }

    loadConsultation()
  }, [consultationId])

  // Conectar ao STT quando iniciar gravação (apenas uma vez)
  useEffect(() => {
    if (status === 'recording' && isSupported()) {
      console.log('🔌 Conectando STT apenas uma vez...')
      connectSTT()
    }
  }, [status]) // Remover connectSTT e isSupported das dependências

  // Enviar segmentos finais para anamnese IA
  useEffect(() => {
    console.log('useEffect anamnese - finalSegments mudaram:', finalSegments.length)
    if (anamneseCallbackRef.current && finalSegments.length > 0) {
      const lastSegment = finalSegments[finalSegments.length - 1]
      console.log('Último segmento:', lastSegment?.text, 'ID:', lastSegment?.id)
      console.log('Último processado:', lastProcessedSegmentId.current)
      
      if (lastSegment && lastSegment.text && lastSegment.id !== lastProcessedSegmentId.current) {
        console.log('✅ Enviando novo segmento para anamnese IA:', lastSegment.text)
        lastProcessedSegmentId.current = lastSegment.id
        anamneseCallbackRef.current(lastSegment.text)
      } else {
        console.log('❌ Segmento não enviado - já processado ou sem texto')
      }
    } else {
      console.log('❌ Callback não registrado ou sem segmentos')
    }
  }, [finalSegments])

  // Limpar estado ao sair da página
  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Resumo da consulta - ${consultation?.patient_name}`,
        text: `Consulta médica realizada em ${consultation?.created_at}`,
        url: window.location.href
      })
    } else {
      // Fallback para copiar link
      navigator.clipboard.writeText(window.location.href)
      console.log('Link copiado para a área de transferência')
    }
  }

  const handleImproveWithAI = async () => {
    try {
      // Em produção, chamar API para gerar notas clínicas
      console.log('Gerando notas clínicas com IA...')
      
      // Simular processamento
      setTimeout(() => {
        console.log('Notas clínicas geradas com sucesso!')
        // Em produção, mostrar resultado ou redirecionar
      }, 2000)
      
    } catch (error) {
      console.error('Erro ao gerar notas com IA:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Carregando consulta...</p>
        </div>
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Consulta não encontrada</h1>
          <p className="text-muted-foreground mb-4">
            A consulta solicitada não foi encontrada ou você não tem permissão para acessá-la.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">
                    Gravação da Consulta
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {consultation.patient_name} • {consultation.consultation_type}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(consultation.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {new Date(consultation.created_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="ml-4"
              >
                <FileText className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-6">
        <ConsentGuard consented={true}>
          {/* Componente específico para Telemedicina */}
          {consultation.consultation_type === 'TELEMEDICINA' && (
            <div className="mb-6">
              <TabCaptureTranscriber 
                consultationId={consultationId}
                onTranscriptionUpdate={(text) => {
                  console.log('📞 [Telemedicina] Nova transcrição:', text)
                  // Enviar transcrição para anamnese IA se callback estiver registrado
                  if (anamneseCallbackRef.current) {
                    anamneseCallbackRef.current(text)
                  }
                }}
              />
            </div>
          )}
          
          <RecordingLayout
            topActions={
              <TopActions
                onPrint={handlePrint}
                onShare={handleShare}
                onImproveWithAI={handleImproveWithAI}
              />
            }
          >
            {/* Coluna esquerda - Anamnese com IA */}
            <AnamneseAIPanel
              consultationId={consultationId}
              initialAnamnese={consultation.anamnese}
              onTranscriptReceived={(callback) => {
                console.log('🔗 Registrando callback de transcrição para anamnese IA')
                anamneseCallbackRef.current = callback
                console.log('✅ Callback registrado:', !!anamneseCallbackRef.current)
              }}
            />
            
            {/* Coluna direita - Transcrição em tempo real */}
            <LiveTranscriptPanel />
          </RecordingLayout>
          
          {/* ControlBar apenas para consultas presenciais */}
          {consultation.consultation_type === 'PRESENCIAL' && (
            <ControlBar consultationId={consultationId} />
          )}
        </ConsentGuard>
      </div>
    </div>
  )
}
