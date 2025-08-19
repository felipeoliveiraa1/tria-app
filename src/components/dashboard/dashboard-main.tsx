"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mic, FileText, Users, TrendingUp, Plus, Play, Download, ArrowLeft, Search, Calendar, Clock, User, Phone, MapPin, Trash2, Eye, X, Square, Pause, RotateCcw, CalendarDays, CheckCircle, XCircle, Gift } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useStats, usePatients, useConsultations } from "@/hooks/use-data"
import { supabase } from "@/lib/supabase"
import { PatientModal } from "./patient-modal"
import { PatientsPage } from "../patients/PatientsPage"
import { MetricCard } from "./metric-card"
import { GreetingCard } from "./greeting-card"


type DashboardView = "main" | "nova-consulta" | "consultas" | "pacientes" | "configuracoes" | "gravacao"

// Tipo para paciente
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

interface DashboardMainProps {
  currentView: DashboardView
  onStartRecording: (consultationId: string) => void
  onCloseRecording: () => void
  recordingPanelOpen: boolean
  currentRecordingId: string | null
  onViewChange: (view: DashboardView) => void
}

export function DashboardMain({ 
  currentView, 
  onStartRecording, 
  onCloseRecording, 
  recordingPanelOpen, 
  currentRecordingId,
  onViewChange
}: DashboardMainProps) {
  const { user } = useAuth()
  const { stats, loading: statsLoading } = useStats()
  const { patients, loading: patientsLoading, addPatient, updatePatient, deletePatient } = usePatients()
  const { consultations, loading: consultationsLoading, addConsultation, updateConsultation, deleteConsultation, refreshConsultations } = useConsultations()
  
  const [modalidade, setModalidade] = useState<"presencial" | "telemedicina">("presencial")
  const [contextoPaciente, setContextoPaciente] = useState("")
  const [microfoneSelecionado, setMicrofoneSelecionado] = useState<string | undefined>(undefined)
  const [gravando, setGravando] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("todas")
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Logs de debug para verificar se os hooks estão funcionando
  useEffect(() => {
    console.log('🔍 DashboardMain - Estado atual:', {
      currentView,
      patientsCount: patients.length,
      consultationsCount: consultations.length,
      patientsLoading,
      consultationsLoading
    })
  }, [currentView, patients, consultations, patientsLoading, consultationsLoading])

  // Log quando a view muda para consultas
  useEffect(() => {
    if (currentView === "consultas") {
      console.log('📋 Mudou para tela de Consultas')
      console.log('📊 Estado das consultas:', {
        loading: consultationsLoading,
        count: consultations.length,
        data: consultations
      })
      
      // Forçar recarregamento das consultas se não houver dados
      if (consultations.length === 0 && !consultationsLoading) {
        console.log('🔄 Forçando recarregamento das consultas...')
        refreshConsultations()
      }
    }
  }, [currentView, consultations, consultationsLoading, refreshConsultations])

  // Estado do modal (sem logs excessivos)
  
  // Log simplificado apenas para debug essencial
  useEffect(() => {
    if (showPatientModal) {
      console.log("🔍 Modal de paciente aberto")
    }
  }, [showPatientModal])



  const handleAddPatient = async (patientData: Patient) => {
    try {
      await addPatient(patientData)
      setShowPatientModal(false)
      setEditingPatient(null)
    } catch (error) {
      console.error("Erro ao adicionar paciente:", error)
      alert("Erro ao adicionar paciente")
    }
  }

  const handleEditPatient = async (patientData: Patient) => {
    if (!editingPatient) return
    
    try {
      await updatePatient(editingPatient.id, patientData)
      setShowPatientModal(false)
      setEditingPatient(null)
    } catch (error) {
      console.error("Erro ao editar paciente:", error)
      alert("Erro ao editar paciente")
    }
  }

  const handleDeletePatient = async (patientId: string) => {
    if (confirm("Tem certeza que deseja excluir este paciente?")) {
      try {
        await deletePatient(patientId)
      } catch (error) {
        console.error("Erro ao excluir paciente:", error)
        alert("Erro ao excluir paciente")
      }
    }
  }

  const handleIniciarGravacao = async () => {
    try {
      // Validar se um paciente foi selecionado
      if (!selectedPatientId) {
        alert("Por favor, selecione um paciente antes de iniciar a gravação.")
        return
      }

      setGravando(true)
      
      // Testar conexão com o Supabase primeiro
      console.log("Testando conexão com Supabase...")
      const { data: testData, error: testError } = await supabase
        .from('consultations')
        .select('count', { count: 'exact', head: true })
      
      if (testError) {
        console.error("Erro na conexão com Supabase:", testError)
        throw new Error(`Erro de conexão: ${testError.message}`)
      }
      
      console.log("Conexão com Supabase OK. Total de consultas:", testData)
      
      console.log("Dados da consulta a ser criada:", {
        patient_id: selectedPatientId,
        doctor_id: user!.id,
        consultation_type: modalidade === "presencial" ? "PRESENCIAL" : "TELEMEDICINA",
        status: "RECORDING",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      // Criar nova consulta no banco
      const newConsultation = await addConsultation({
        patient_id: selectedPatientId,
        doctor_id: user!.id,
        consultation_type: modalidade === "presencial" ? "PRESENCIAL" : "TELEMEDICINA",
        status: "RECORDING",
        patient_name: patients.find(p => p.id === selectedPatientId)?.name || "Paciente",
        patient_context: contextoPaciente,
        duration: 0,
        recording_url: null,
        notes: null,
        diagnosis: null,
        treatment: null,
        prescription: null,
        next_appointment: null
      })

      console.log("Consulta criada:", newConsultation)
      
      // Abrir painel de gravação
      if (newConsultation) {
        onStartRecording(newConsultation.id)
      }
      
    } catch (error) {
      console.error("Erro ao criar consulta:", error)
      
      // Mostrar detalhes do erro
      if (error instanceof Error) {
        console.error("Mensagem de erro:", error.message)
        console.error("Stack trace:", error.stack)
      }
      
      // Verificar se é um erro do Supabase
      if (error && typeof error === 'object' && 'message' in error) {
        console.error("Erro do Supabase:", error)
      }
      
      // Em produção, mostrar toast de erro para o usuário
      alert(`Erro ao criar consulta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      
    } finally {
      setGravando(false)
    }
  }

  // Filtrar consultas baseado no status e busca
  const filteredConsultations = consultations.filter(consulta => {
    const matchesStatus = filterStatus === "todas" || 
      (filterStatus === "agendadas" && consulta.status === "CREATED") ||
      (filterStatus === "em_andamento" && consulta.status === "RECORDING") ||
      (filterStatus === "concluidas" && consulta.status === "COMPLETED") ||
      (filterStatus === "canceladas" && consulta.status === "CANCELLED")
    
    const matchesSearch = searchTerm === "" || 
      (consulta.patient_name && consulta.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patients.find(p => p.id === consulta.patient_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesStatus && matchesSearch
  })

  // Filtrar pacientes baseado na busca
  const filteredPatients = patients.filter(patient => 
    searchTerm === "" || 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Enquanto não montou no cliente, evita hidratação instável renderizando placeholder estático
  if (!mounted) {
    return (
      <main className="p-4 lg:p-6 space-y-6 h-full w-full max-w-none pb-16">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <div className="h-40 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-28 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="space-y-4 w-full">
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      </main>
    )
  }

  // Tela de Nova Consulta
  if (currentView === "nova-consulta") {
    // Importar dinamicamente para evitar problemas de SSR
    const NovaConsultaPage = dynamic(() => import("@/app/dashboard/nova-consulta/page"), {
      ssr: false,
      loading: () => (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )
    })
    
    return <NovaConsultaPage />
  }

  // Tela de Consultas
  if (currentView === "consultas") {
    return (
      <main className="p-6 space-y-6 h-full w-full max-w-none pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Consultas</h1>
            <p className="text-muted-foreground">Gerencie todas as suas consultas</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary-dark"
            onClick={() => onViewChange("nova-consulta")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar consultas..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="agendadas">Agendadas</SelectItem>
                              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluidas">Concluídas</SelectItem>
              <SelectItem value="canceladas">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Consultas */}
        {consultationsLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando consultas...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConsultations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
              </div>
            ) : (
              filteredConsultations.map((consulta) => {
                const patient = patients.find(p => p.id === consulta.patient_id)
                const patientName = consulta.patient_name || patient?.name || "Paciente não encontrado"
                const consultationDate = consulta.created_at
                const consultationTime = formatTimeBR(consulta.created_at)
                const consultationType = consulta.consultation_type || "PRESENCIAL"
                
                return (
                  <Card key={consulta.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {patientName}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {consultationDate ? formatDateBR(consultationDate) : "Data não definida"}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {consultationTime}
                              </span>
                              <span className="flex items-center">
                                <Mic className="h-4 w-4 mr-1" />
                                {consultationType === "PRESENCIAL" ? "Presencial" : "Telemedicina"}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Badge variant={
                            consulta.status === "COMPLETED" ? "default" :
                            consulta.status === "RECORDING" ? "secondary" :
                            consulta.status === "CREATED" ? "outline" : "destructive"
                          }>
                            {consulta.status === "COMPLETED" ? "Concluída" :
                             consulta.status === "RECORDING" ? "Em andamento" :
                             consulta.status === "CREATED" ? "Agendada" : 
                             consulta.status === "CANCELLED" ? "Cancelada" : consulta.status}
                          </Badge>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Duração</p>
                            <p className="font-medium">
                              {consulta.duration ? `${Math.floor(consulta.duration / 60)}:${(consulta.duration % 60).toString().padStart(2, '0')}` : "-"}
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => window.open(`/dashboard/patients/${consulta.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={async () => {
                                try {
                                  const ok = confirm('Deseja realmente apagar esta consulta? Esta ação não pode ser desfeita.')
                                  if (!ok) return
                                  await deleteConsultation(consulta.id)
                                  refreshConsultations()
                                } catch (e) {
                                  console.error('Erro ao apagar consulta:', e)
                                  alert('Não foi possível apagar a consulta. Tente novamente.')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </main>
    )
  }

  // Tela de Pacientes
  if (currentView === "pacientes") {
    return (
      <main className="p-6 space-y-6 h-full w-full max-w-none pb-16">
        <PatientsPage />
      </main>
    )
  }









  // Tela de Configurações
  if (currentView === "configuracoes") {
    return (
      <main className="p-6 space-y-6 h-full w-full max-w-none pb-16">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Personalize suas preferências do sistema</p>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* Perfil do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil do Usuário</CardTitle>
              <CardDescription>Informações pessoais e de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input value={user?.user_metadata?.full_name || user?.email || ""} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user?.email || ""} className="mt-1" disabled />
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary-dark">Salvar Alterações</Button>
            </CardContent>
          </Card>

          {/* Configurações de Áudio */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Áudio</CardTitle>
              <CardDescription>Preferências para gravação e transcrição</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Dispositivo de Áudio Padrão</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o dispositivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Microfone Padrão</SelectItem>
                      <SelectItem value="airpods">AirPods Pro</SelectItem>
                      <SelectItem value="external">Microfone Externo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Qualidade de Gravação</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione a qualidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa (16kHz)</SelectItem>
                      <SelectItem value="medium">Média (44.1kHz)</SelectItem>
                      <SelectItem value="high">Alta (48kHz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary-dark">Salvar Configurações</Button>
            </CardContent>
          </Card>

          {/* Configurações de Notificações */}
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure como receber alertas e lembretes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lembretes de Consulta</p>
                    <p className="text-sm text-muted-foreground">Receber notificações antes das consultas</p>
                  </div>
                  <Button variant="outline" size="sm">Ativado</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Transcrições Concluídas</p>
                    <p className="text-sm text-muted-foreground">Notificar quando transcrições estiverem prontas</p>
                  </div>
                  <Button variant="outline" size="sm">Ativado</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Atualizações do Sistema</p>
                    <p className="text-sm text-muted-foreground">Receber notificações sobre novas funcionalidades</p>
                  </div>
                  <Button variant="outline" size="sm">Desativado</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Privacidade */}
          <Card>
            <CardHeader>
              <CardTitle>Privacidade e Segurança</CardTitle>
              <CardDescription>Configurações de segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Autenticação em Duas Etapas</p>
                    <p className="text-sm text-muted-foreground">Adicionar uma camada extra de segurança</p>
                  </div>
                  <Button variant="outline" size="sm">Configurar</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Alterar Senha</p>
                    <p className="text-sm text-muted-foreground">Atualizar sua senha de acesso</p>
                  </div>
                  <Button variant="outline" size="sm">Alterar</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Exportar Dados</p>
                    <p className="text-sm text-muted-foreground">Baixar uma cópia dos seus dados</p>
                  </div>
                  <Button variant="outline" size="sm">Exportar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // Dashboard Principal
  const statsData = [
    {
      title: "Consultas Hoje",
      value: statsLoading ? "..." : stats.todayConsultations.toString(),
      change: "+2",
      icon: Mic,
      color: "text-primary",
    },
    {
      title: "Total de Consultas",
      value: statsLoading ? "..." : stats.totalConsultations.toString(),
      change: "+23",
      icon: FileText,
      color: "text-blue-500",
    },
    {
      title: "Pacientes Ativos",
      value: statsLoading ? "..." : stats.totalPatients.toString(),
      change: "+5",
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Produtividade",
      value: statsLoading ? "..." : `${stats.productivity}%`,
      change: "+12%",
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ]

  const quickActions = [
    {
      title: "Nova Consulta",
      description: "Iniciar gravação de consulta",
      icon: Plus,
      action: "Iniciar",
      color: "bg-primary hover:bg-primary-dark",
    },
    {
      title: "Ver Demonstração",
      description: "Como usar o sistema",
      icon: Play,
      action: "Assistir",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Baixar Relatório",
      description: "Relatório mensal",
      icon: Download,
      action: "Baixar",
      color: "bg-green-500 hover:bg-green-600",
    },
  ]

  const handleDownloadReport = () => {
    try {
      const header = [
        'id',
        'data',
        'hora',
        'paciente',
        'tipo',
        'status',
        'duracao_s'
      ]
      const rows = consultations.map((c) => {
        const date = c.created_at ? new Date(c.created_at) : new Date()
        const dateStr = date.toLocaleDateString('pt-BR')
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const patientName = c.patient_name || patients.find(p => p.id === c.patient_id)?.name || ''
        return [
          c.id,
          dateStr,
          timeStr,
          `"${patientName.replaceAll('"', '""')}"`,
          c.consultation_type || '',
          c.status || '',
          String(c.duration ?? 0)
        ]
      })
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().slice(0, 10)
      a.download = `relatorio-consultas-${today}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Não foi possível gerar o relatório. Tente novamente.')
    }
  }

  // Distribuição de consultas na semana (Segunda a Sexta) baseada no banco
  const weeklyDistribution = useMemo(() => {
    if (!mounted) {
      return [
        { day: "Segunda", count: 0, percentage: 0 },
        { day: "Terça", count: 0, percentage: 0 },
        { day: "Quarta", count: 0, percentage: 0 },
        { day: "Quinta", count: 0, percentage: 0 },
        { day: "Sexta", count: 0, percentage: 0 },
      ]
    }
    // Nomes dos dias (Segunda a Sexta)
    const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
    const counts = [0, 0, 0, 0, 0]

    // Início da semana (segunda-feira) à meia-noite
    const now = new Date()
    const current = new Date(now)
    current.setHours(0, 0, 0, 0)
    const day = current.getDay() // 0 = domingo, 1 = segunda, ... 6 = sábado
    const diffToMonday = (day + 6) % 7
    const weekStart = new Date(current)
    weekStart.setDate(current.getDate() - diffToMonday)
    const nextWeekStart = new Date(weekStart)
    nextWeekStart.setDate(weekStart.getDate() + 7)

    for (const c of consultations) {
      const rawDate = (c as any).scheduled_date || c.created_at
      if (!rawDate) continue
      const d = new Date(rawDate)
      if (d < weekStart || d >= nextWeekStart) continue
      const dow = d.getDay() // 1..5 interessam
      if (dow >= 1 && dow <= 5) {
        counts[dow - 1] += 1
      }
    }

    const maxCount = Math.max(1, ...counts)
    return counts.map((count, i) => ({
      day: dayNames[i],
      count,
      percentage: Math.round((count / maxCount) * 100)
    }))
  }, [consultations, mounted])

  const formatTimeBR = (value: string | number | Date) => {
    try {
      return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    } catch {
      return ''
    }
  }
  const formatDateBR = (value: string | number | Date) => {
    try {
      return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
      return ''
    }
  }

  return (
    <main className="p-4 lg:p-6 space-y-6 h-full w-full max-w-none pb-16">
      {/* Saudações + KPIs lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <GreetingCard userName={user?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.email || null} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard title="Consultas Hoje" value={stats.todayConsultations} variant="green" icon={<CalendarDays className="h-5 w-5" />} />
          <MetricCard title="Total de Consultas" value={stats.totalConsultations} variant="blue" icon={<FileText className="h-5 w-5" />} />
          <MetricCard title="Pacientes Ativos" value={stats.totalPatients} variant="cyan" icon={<Users className="h-5 w-5" />} />
          <MetricCard title="Produtividade" value={`${stats.productivity}%`} variant="orange" icon={<TrendingUp className="h-5 w-5" />} />
        </div>
      </div>

      {/* Ações rápidas abaixo dos cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <Card key={action.title} className="card-hover animate-slide-up border-border shadow-sm" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className={`w-full ${action.color} text-white`}
                onClick={() => {
                  if (action.title === 'Nova Consulta') {
                    onViewChange('nova-consulta')
                  } else if (action.title === 'Ver Demonstração') {
                    window.open('https://www.loom.com/share/collection/7871f9f0b8a44f7e83f2e7-demo', '_blank')
                  } else if (action.title === 'Baixar Relatório') {
                    handleDownloadReport()
                  }
                }}
              >
                {action.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and lists */}
      <div className="space-y-4 w-full">
        <h3 className="text-xl font-semibold text-foreground">Atividade Recente</h3>
        <Card className="card-hover w-full border-border shadow-sm">
          <CardHeader>
            <CardTitle>Consultas de Hoje</CardTitle>
            <CardDescription>Últimas consultas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {consultationsLoading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Carregando consultas...</p>
              </div>
            ) : consultations.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {consultations.slice(0, 3).map((consultation, index) => {
                  const patient = patients.find(p => p.id === consultation.patient_id)
                  return (
                    <div key={consultation.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm font-medium text-foreground">
                          {formatTimeBR(consultation.created_at)}
                        </span>
                        <span className="text-sm text-foreground-secondary">
                          {patient?.name || "Paciente não encontrado"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 bg-accent rounded-full text-foreground-secondary">
                          {consultation.consultation_type === "PRESENCIAL" ? "Presencial" : "Telemedicina"}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          consultation.status === "COMPLETED" 
                            ? "bg-green-100 text-green-800" 
                            : consultation.status === "RECORDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                                                     {consultation.status === "COMPLETED" ? "Concluída" :
                            consultation.status === "RECORDING" ? "Em andamento" : "Agendada"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Content to Fill Space */}
      <div className="space-y-4 w-full">
        <h3 className="text-xl font-semibold text-foreground">Resumo Semanal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Card className="card-hover w-full">
            <CardHeader>
              <CardTitle>Consultas da Semana</CardTitle>
              <CardDescription>Distribuição por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weeklyDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground-secondary">{item.day}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground">{item.count}</span>
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover w-full">
            <CardHeader>
              <CardTitle>Próximas Consultas</CardTitle>
              <CardDescription>Agenda de hoje</CardDescription>
            </CardHeader>
            <CardContent>
              {consultationsLoading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Carregando consultas...</p>
                </div>
              ) : consultations.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Nenhuma consulta agendada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consultations
                    .filter(c => c.status === "CREATED")
                    .slice(0, 4)
                    .map((consultation, index) => {
                      const patient = patients.find(p => p.id === consultation.patient_id)
                      return (
                        <div key={consultation.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-foreground">
                              {formatTimeBR(consultation.created_at)}
                            </span>
                            <span className="text-sm text-foreground-secondary">
                              {patient?.name || "Paciente não encontrado"}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-accent rounded-full text-foreground-secondary">
                            {consultation.consultation_type === "PRESENCIAL" ? "Presencial" : "Telemedicina"}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      

      {/* Painel de Gravação Lateral */}
      {recordingPanelOpen && currentRecordingId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Header do Painel */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-semibold">Gravação da Consulta</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseRecording}
                className="hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Conteúdo do Painel de Gravação */}
            <div className="flex-1 overflow-hidden">
              <RecordingPanel 
                consultationId={currentRecordingId} 
                onClose={onCloseRecording}
                onFinalized={() => {
                  // Recarregar consultas e ir para a aba de consultas
                  refreshConsultations()
                  onViewChange('consultas')
                }}
              />
            </div>
          </div>
        </div>
      )}

            {/* Modal de Paciente - REMOVIDO - AGORA USANDO PatientUpsertDialog */}
      
      {/* Comentando o PatientModal temporariamente para teste */}
      {/*
      <PatientModal
        isOpen={showPatientModal}
        patient={editingPatient}
        onSubmit={editingPatient ? handleEditPatient : handleAddPatient}
        onCancel={() => {
          setShowPatientModal(false)
          setEditingPatient(null)
        }}
      />
      */}

    </main>
  )
}

// Componente do Formulário de Pacientes
function PatientForm({ 
  patient, 
  onSubmit, 
  onCancel 
}: { 
  patient: Patient; 
  onSubmit: (data: Omit<Patient, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: patient?.name || "",
    email: patient?.email || "",
    phone: patient?.phone || "",
    city: patient?.city || "",
    status: patient?.status || "active"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Nome Completo *</label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Nome completo do paciente"
            required
            className="mt-1"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Email *</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="email@exemplo.com"
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Telefone</label>
          <Input
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(11) 99999-9999"
            className="mt-1"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Cidade</label>
          <Input
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            placeholder="São Paulo"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary-dark">
          {patient ? "Atualizar" : "Cadastrar"} Paciente
        </Button>
      </div>
    </form>
  )
}

// Componente do Painel de Gravação
function RecordingPanel({ consultationId, onClose, onFinalized }: { consultationId: string; onClose: () => void; onFinalized?: () => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [transcription, setTranscription] = useState("")
  const [audioLevel, setAudioLevel] = useState(0)

  // Simular gravação
  const startRecording = () => {
    setIsRecording(true)
    const startTime = Date.now()
    
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime)
    }, 100)
    
    const audioTimer = setInterval(() => {
      setAudioLevel(Math.random() * 100)
    }, 50)
    
    // Simular transcrição em tempo real
    const transcriptionTimer = setInterval(() => {
      const sampleTexts = [
        "Bom dia, como você está se sentindo hoje?",
        "Vou fazer algumas perguntas sobre seus sintomas.",
        "Você tem sentido alguma dor ou desconforto?",
        "Vamos verificar sua pressão arterial agora.",
        "Como está seu sono ultimamente?"
      ]
      
      const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]
      setTranscription(prev => prev + " " + randomText)
    }, 3000)
    
    return () => {
      clearInterval(timer)
      clearInterval(audioTimer)
      clearInterval(transcriptionTimer)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
  }

  const finalizeConsultation = async () => {
    try {
      // Converter ms para segundos
      const durationSeconds = Math.floor(elapsed / 1000)
      const res = await fetch('/api/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: consultationId,
          status: 'COMPLETED',
          duration: durationSeconds
        })
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }
      onFinalized?.()
      onClose()
    } catch (err) {
      console.error('Erro ao finalizar consulta:', err)
      alert('Não foi possível finalizar a consulta. Tente novamente.')
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header da Gravação */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
              <h3 className="font-semibold">Gravação da Consulta</h3>
              <p className="text-sm text-muted-foreground">ID: {consultationId}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold">{formatTime(elapsed)}</div>
              <div className="text-xs text-muted-foreground">Tempo de Gravação</div>
            </div>
            
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-6 py-3 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Parar Gravação
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Iniciar Gravação
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Coluna Esquerda - Controles e Status */}
        <div className="w-1/3 border-r border-border p-4 space-y-6">
          {/* Status da Gravação */}
          <div className="space-y-3">
            <h4 className="font-medium">Status da Gravação</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={isRecording ? "default" : "secondary"}>
                  {isRecording ? "Gravando" : "Parado"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tempo:</span>
                <span className="text-sm font-mono">{formatTime(elapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tamanho:</span>
                <span className="text-sm">{(elapsed / 1000 * 0.064).toFixed(2)} MB</span>
              </div>
            </div>
          </div>

          {/* Nível de Áudio */}
          <div className="space-y-3">
            <h4 className="font-medium">Nível de Áudio</h4>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {Math.round(audioLevel)}%
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="space-y-3">
            <h4 className="font-medium">Ações Rápidas</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Salvar Transcrição
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar Áudio
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                Salvar Transcrição
              </Button>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Transcrição em Tempo Real */}
        <div className="flex-1 p-4">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Transcrição em Tempo Real</h4>
              <Badge variant="outline">
                {transcription.split(' ').length} palavras
              </Badge>
            </div>
            
            <div className="flex-1 bg-muted rounded-lg p-4 overflow-y-auto">
              {transcription ? (
                <div className="space-y-2">
                  {transcription.split('.').filter(Boolean).map((sentence, index) => (
                    <p key={index} className="text-sm leading-relaxed">
                      {sentence.trim()}.
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Mic className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Inicie a gravação para ver a transcrição em tempo real</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer com Controles */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reiniciar
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={finalizeConsultation}>
              <FileText className="h-4 w-4 mr-2" />
              Finalizar Consulta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}




