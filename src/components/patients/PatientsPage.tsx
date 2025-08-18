"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Eye, User, Phone, MapPin } from "lucide-react"
import { usePatients } from "@/hooks/use-data"
import { PatientUpsertDialog } from "./PatientUpsertDialog"
import { useAuth } from "@/contexts/auth-context"
import { PatientDetailsModal } from "./PatientDetailsModal"

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

interface PatientFormData {
  name: string
  email: string
  phone: string
  city: string
  status: "active" | "inactive"
}

export function PatientsPage() {
  const { user } = useAuth()
  const { patients, loading, addPatient, updatePatient, deletePatient } = usePatients()
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // Filtrar pacientes baseado na busca
  const filteredPatients = patients.filter(patient => 
    searchTerm === "" || 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreatePatient = async (patientData: PatientFormData) => {
    try {
      const payload = {
        ...patientData,
        doctor_id: user?.id || ''
      }
      await addPatient(payload as any)
      setIsCreateOpen(false)
    } catch (error) {
      console.error("Erro ao criar paciente:", error)
      throw error
    }
  }

  const handleEditPatient = async (patientData: PatientFormData) => {
    if (!editingPatient) return
    
    try {
      // Converter PatientFormData para Patient
      const updatedPatient: Patient = {
        ...editingPatient,
        ...patientData
      }
      await updatePatient(editingPatient.id, updatedPatient)
      setEditingPatient(null)
    } catch (error) {
      console.error("Erro ao editar paciente:", error)
      throw error
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

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient)
  }

  const closeEditDialog = () => {
    setEditingPatient(null)
  }

  const openPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient)
    setIsDetailsModalOpen(true)
  }

  const closePatientDetails = () => {
    setSelectedPatient(null)
    setIsDetailsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie o cadastro de seus pacientes</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-dark"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar pacientes..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Pacientes */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando pacientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">Nenhum paciente encontrado</p>
            </div>
          ) : (
            filteredPatients.map((paciente) => (
              <Card key={paciente.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant={paciente.status === "active" ? "default" : "secondary"}>
                      {paciente.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{paciente.name}</CardTitle>
                  <CardDescription>{paciente.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{paciente.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{paciente.city}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                      {/* Aqui você pode adicionar a contagem de consultas */}
                      0 consultas
                    </span>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openPatientDetails(paciente)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(paciente)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeletePatient(paciente.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal de Criação - SEMPRE MONTADO */}
      <PatientUpsertDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreatePatient}
      />

      {/* Modal de Edição - SEMPRE MONTADO */}
      <PatientUpsertDialog
        open={!!editingPatient}
        onOpenChange={(open) => !open && closeEditDialog()}
        initialData={editingPatient}
        onSubmit={handleEditPatient}
      />

      {/* Modal de Detalhes do Paciente */}
      <PatientDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        patient={selectedPatient}
      />
    </div>
  )
}
