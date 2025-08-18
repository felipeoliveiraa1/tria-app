"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Mic, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { PatientCombobox } from "@/components/dashboard/patient-combobox"
import { DeviceSelector } from "@/components/recording/components/device-selector"
import { useRecordingSetupStore } from "@/components/recording/store/recording-setup-store"
import { useAutosaveContextForm } from "@/components/recording/hooks/use-autosave-context-form"
import { newAppointmentSchema, type NewAppointmentFormData } from "@/lib/validations"
import { PatientModal } from "@/components/dashboard/patient-modal"
import { useRecordingStore } from "@/components/recording/store/recording-store"
import { useAuth } from "@/contexts/auth-context"

// Tipo para o formulário de paciente
interface PatientFormData {
  name: string
  email: string
  phone: string
  city: string
  status: "active" | "inactive"
}

export default function NovaConsultaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { session } = useAuth()
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Store para configuração de gravação
  const {
    mode,
    patientId,
    context,
    deviceId,
    sampleRate,
    consent,
    setField
  } = useRecordingSetupStore()
  
  // Hook de autosave para contexto
  const { updateContext, lastSaved } = useAutosaveContextForm()
  
  // Formulário com React Hook Form
  const form = useForm<NewAppointmentFormData>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      mode: mode || undefined,
      patientId: patientId || undefined,
      context: context || "",
      deviceId: deviceId || undefined,
      sampleRate: sampleRate || undefined,
      consent: consent || false
    }
  })
  
  // Sincronizar store com formulário apenas uma vez na montagem
  useEffect(() => {
    const syncForm = () => {
      if (mode) form.setValue('mode', mode)
      if (patientId) form.setValue('patientId', patientId)
      if (context) form.setValue('context', context)
      if (deviceId) form.setValue('deviceId', deviceId)
      if (sampleRate) form.setValue('sampleRate', sampleRate)
      if (consent) form.setValue('consent', consent)
    }
    
    // Sincronizar apenas se o formulário não tiver valores
    if (!form.getValues('mode') && !form.getValues('patientId')) {
      syncForm()
    }
  }, []) // Executar apenas uma vez no mount
  
  // Atualizar contexto com autosave
  const handleContextChange = useCallback((newContext: string) => {
    // updateContext já chama setField internamente, não precisamos chamar novamente
    updateContext(newContext)
    form.setValue('context', newContext)
  }, []) // Removidas dependências para evitar loops
  
  // Selecionar dispositivo de áudio
  const handleDeviceChange = useCallback((deviceId: string, sampleRate: number) => {
    setField('deviceId', deviceId)
    setField('sampleRate', sampleRate)
    form.setValue('deviceId', deviceId)
    form.setValue('sampleRate', sampleRate)
  }, []) // Removidas dependências para evitar loops
  
  // Abrir modal de novo paciente
  const handleNewPatient = useCallback(() => {
    setShowPatientModal(true)
  }, []) // Removidas dependências para evitar loops

  // Selecionar paciente
  const handlePatientChange = useCallback((value: string) => {
    setField('patientId', value)
    form.setValue('patientId', value)
  }, []) // Removidas dependências para evitar loops

  // Alterar consentimento
  const handleConsentChange = useCallback((checked: boolean | 'indeterminate') => {
    const isChecked = checked === true
    setField('consent', isChecked)
    form.setValue('consent', isChecked)
  }, []) // Removidas dependências para evitar loops

  // Selecionar modo presencial
  const handlePresencialMode = useCallback(() => {
    setField('mode', 'presencial')
    form.setValue('mode', 'presencial')
  }, []) // Removidas dependências para evitar loops

  // Selecionar modo telemedicina
  const handleTelemedicinaMode = useCallback(() => {
    setField('mode', 'telemedicina')
    form.setValue('mode', 'telemedicina')
  }, []) // Removidas dependências para evitar loops

  // Voltar ao dashboard
  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  // Alterar texto do textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContextChange(e.target.value)
  }, []) // Removidas dependências para evitar loops
  
  // Fechar modal e atualizar paciente se necessário
  const handlePatientSave = useCallback((data: PatientFormData) => {
    // Criar um ID mock válido para o novo paciente
    const newPatientId = `mock-${Date.now()}`
    
    console.log('Novo paciente criado:', { id: newPatientId, ...data })
    
    // Salvar no store
    setField('patientId', newPatientId)
    form.setValue('patientId', newPatientId)
    
    // Fechar modal
    setShowPatientModal(false)
    
    // Mostrar toast de sucesso
    toast({
      title: "Paciente criado!",
      description: `Paciente ${data.name} foi criado com sucesso.`,
      action: <CheckCircle className="h-4 w-4 text-green-500" />
    })
  }, [setField, form, setShowPatientModal, toast])
  
  // Função para buscar o nome do paciente pelo ID
  const getPatientName = async (patientId: string): Promise<string> => {
    try {
      console.log('Buscando nome do paciente para ID:', patientId)
      
      // Se for um ID temporário, retornar um nome padrão
      if (patientId.startsWith('temp-')) {
        return `Paciente Temporário ${patientId.split('-')[1]}`
      }
      
      // Se for um ID mock, retornar nome correspondente
      if (patientId.startsWith('mock-')) {
        const mockNames: { [key: string]: string } = {
          'mock-1': 'Maria Santos Silva',
          'mock-2': 'João Oliveira Costa',
          'mock-3': 'Ana Costa Ferreira',
          'mock-4': 'Pedro Almeida Santos',
          'mock-5': 'Lucia Ferreira Lima'
        }
        
        // Se for um ID mock dinâmico (mock-timestamp), usar nome padrão
        if (patientId.includes('-') && patientId.split('-').length > 2) {
          return 'Novo Paciente'
        }
        
        const name = mockNames[patientId]
        console.log('Nome encontrado para mock ID:', patientId, '->', name)
        if (name) {
          return name
        }
      }
      
      // Buscar dados do paciente na API
      console.log('Buscando paciente na API:', patientId)
      try {
        const response = await fetch(`/api/patients/${patientId}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
          credentials: 'same-origin'
        })
        if (response.ok) {
          const patientData = await response.json()
          const name = patientData.patient?.name
          console.log('Nome encontrado na API:', name)
          if (name) {
            return name
          }
        }
      } catch (apiError) {
        console.warn('Erro na API de pacientes:', apiError)
      }
      
      // Se não conseguir buscar, usar um nome padrão baseado no ID
      console.log('Usando nome padrão baseado no ID')
      if (patientId.startsWith('mock-')) {
        return `Paciente ${patientId.split('-')[1]}`
      }
      
      return 'Paciente Desconhecido'
    } catch (error) {
      console.error('Erro ao buscar nome do paciente:', error)
      return 'Paciente Desconhecido'
    }
  }
  
  // Função para buscar o nome do paciente diretamente da lista de pacientes
  const getPatientNameFromList = async (patientId: string): Promise<string> => {
    try {
      console.log('🔄 Buscando nome do paciente para ID:', patientId)
      
      // Buscar pacientes reais do Supabase
      const response = await fetch('/api/patients', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        credentials: 'same-origin'
      })
      if (!response.ok) {
        console.error('❌ Erro na resposta da API de pacientes:', response.status)
        throw new Error('Erro ao buscar pacientes')
      }
      
      const data = await response.json()
      console.log('📊 Dados recebidos da API de pacientes:', data)
      
      const patients = data.patients || []
      console.log('👥 Lista de pacientes:', patients)
      
      // Buscar o paciente pelo ID
      const patient = patients.find((p: any) => p.id === patientId)
      console.log('🔍 Paciente encontrado:', patient)
      
      if (patient && patient.name) {
        console.log('✅ Nome encontrado na lista real:', patientId, '->', patient.name)
        return patient.name
      }
      
      console.log('⚠️ Paciente não encontrado na lista:', patientId)
      return 'Paciente Desconhecido'
    } catch (error) {
      console.error('❌ Erro ao buscar nome do paciente:', error)
      return 'Paciente Desconhecido'
    }
  }
  
  // Submeter formulário
  const onSubmit = async (data: NewAppointmentFormData) => {
    try {
      setIsSubmitting(true)
      
      // Validar se todos os campos obrigatórios estão preenchidos
      if (!data.mode || !data.patientId || !data.deviceId || !data.sampleRate || !data.consent) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive"
        })
        return
      }
      
      // Buscar o nome real do paciente - usar função local primeiro
      const patientName = await getPatientNameFromList(data.patientId)
      console.log('Nome do paciente encontrado:', patientName)
      
      console.log('Criando consulta com dados:', {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        patient_id: data.patientId,
        patient_name: patientName,
        patient_context: data.context,
        consultation_type: data.mode === 'presencial' ? 'PRESENCIAL' : 'TELEMEDICINA',
        status: 'CREATED'
      })
      
      // Criar consulta no banco de dados
      const consultationResponse = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          patient_id: data.patientId, // ID do paciente selecionado
          patient_name: patientName, // Nome real do paciente
          patient_context: data.context,
          consultation_type: data.mode === 'presencial' ? 'PRESENCIAL' : 'TELEMEDICINA',
          status: 'CREATED'
        })
      })
      
      if (!consultationResponse.ok) {
        const errorData = await consultationResponse.json()
        throw new Error(errorData.error || 'Erro ao criar consulta')
      }
      
      const consultationData = await consultationResponse.json()
      const consultationId = consultationData.consultation.id
      
      console.log('Consulta criada com sucesso:', consultationData)
      console.log('ID da consulta:', consultationId)
      console.log('Nome do paciente na consulta:', consultationData.consultation.patient_name)
      
      // Salvar consultationId no store
      setField('consultationId', consultationId)
      
      console.log('consultationId salvo no store:', consultationId)
      
      // Mostrar sucesso
      toast({
        title: "Consulta criada!",
        description: `Consulta criada para ${patientName}. Redirecionando para a gravação...`,
        action: <CheckCircle className="h-4 w-4 text-green-500" />
      })
      
      // Navegar para a tela de gravação
      router.push(`/dashboard/appointments/${consultationId}`)
      
    } catch (error) {
      console.error('Erro ao criar consulta:', error)
      toast({
        title: "Erro ao criar consulta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Verificar se o formulário está válido
  const isFormValid = form.formState.isValid && consent && deviceId && patientId && mode
  
  return (
    <main className="p-6 space-y-6 h-full w-full max-w-none">
      {/* Header com botão voltar */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Dashboard</span>
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Nova Consulta</h1>
          <p className="text-muted-foreground">
            Configure os parâmetros e inicie a gravação da sua consulta
          </p>
        </div>

        {/* Banner de Informação */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start space-x-3">
          <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground">
            <p className="font-medium mb-1">Dica importante:</p>
            <p>Certifique-se de permitir o acesso ao microfone e selecionar o dispositivo correto.</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Modalidade da Consulta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Modalidade da consulta</span>
                <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
              </CardTitle>
              <CardDescription>
                Selecione se a consulta será presencial ou por telemedicina
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={mode === "presencial" ? "default" : "outline"}
                  className={`h-16 text-lg font-medium ${
                    mode === "presencial" 
                      ? "bg-primary text-white hover:bg-primary/90" 
                      : "hover:bg-muted"
                  }`}
                  onClick={handlePresencialMode}
                >
                  Presencial
                </Button>
                <Button
                  type="button"
                  variant={mode === "telemedicina" ? "default" : "outline"}
                  className={`h-16 text-lg font-medium ${
                    mode === "telemedicina" 
                      ? "bg-primary text-white hover:bg-primary/90" 
                      : "hover:bg-muted"
                  }`}
                  onClick={handleTelemedicinaMode}
                >
                  Telemedicina
                </Button>
              </div>
              {form.formState.errors.mode && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.mode.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seleção de Paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Paciente</CardTitle>
              <CardDescription>
                Escolha o paciente para esta consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientCombobox
                value={patientId || undefined}
                onValueChange={handlePatientChange}
                onNewPatient={handleNewPatient}
                disabled={isSubmitting}
              />
              {form.formState.errors.patientId && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.patientId.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contexto do Paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Contexto do paciente</CardTitle>
              <CardDescription>
                Informações clínicas relevantes para a consulta
                {lastSaved && (
                  <span className="block text-xs text-green-600 mt-1">
                    ✓ Rascunho salvo às {lastSaved.toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Preencha este campo com informações clínicas do paciente: medicamentos, prontuários anteriores ou exames. Isso ajuda a fornecer um documento clínico mais completo."
                value={context}
                onChange={handleTextareaChange}
                className="min-h-[120px] resize-none"
                disabled={isSubmitting}
              />
              {form.formState.errors.context && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.context.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seleção de Microfone */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Áudio</CardTitle>
              <CardDescription>
                Selecione o dispositivo de áudio para gravação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceSelector
                value={deviceId || undefined}
                onValueChange={handleDeviceChange}
                disabled={isSubmitting}
              />
              {form.formState.errors.deviceId && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.deviceId.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Consentimento */}
          <Card>
            <CardHeader>
              <CardTitle>Consentimento</CardTitle>
              <CardDescription>
                Confirmação de consentimento para gravação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={handleConsentChange}
                  disabled={isSubmitting}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="consent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tenho o consentimento do paciente para gravação
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Confirme que o paciente autorizou a gravação desta consulta.
                  </p>
                </div>
              </div>
              {form.formState.errors.consent && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.consent.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Botão de Gravação */}
          <div className="text-center pt-6">
            <Button
              type="submit"
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-medium h-16"
              disabled={!isFormValid || isSubmitting}
            >
              <Mic className="h-6 w-6 mr-3" />
              {isSubmitting ? "Criando consulta..." : "Gravar consulta"}
            </Button>
            
            {!isFormValid && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Para habilitar a gravação, complete todos os campos obrigatórios:</p>
                <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                  {!mode && <li>• Selecione a modalidade da consulta</li>}
                  {!patientId && <li>• Escolha um paciente</li>}
                  {!deviceId && <li>• Selecione um microfone</li>}
                  {!consent && <li>• Confirme o consentimento</li>}
                </ul>
              </div>
            )}
          </div>

          {/* Informações Adicionais */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>• A gravação será iniciada automaticamente</p>
            <p>• Você pode pausar e retomar a gravação a qualquer momento</p>
            <p>• A transcrição será processada em tempo real</p>
          </div>
        </form>
      </div>

      {/* Modal de Novo Paciente */}
      {showPatientModal && (
        <PatientModal
          isOpen={showPatientModal}
          patient={null}
          onSubmit={handlePatientSave}
          onCancel={() => setShowPatientModal(false)}
        />
      )}
    </main>
  )
}
