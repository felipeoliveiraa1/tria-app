"use client"

import { useState } from "react"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardHeader } from "./dashboard-header"
import { DashboardMain } from "./dashboard-main"

type DashboardView = "main" | "nova-consulta" | "consultas" | "pacientes" | "configuracoes" | "gravacao"

export function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState<DashboardView>("main")
  const [recordingPanelOpen, setRecordingPanelOpen] = useState(false)
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null)

  const handleStartRecording = (consultationId: string) => {
    setCurrentRecordingId(consultationId)
    setRecordingPanelOpen(true)
    setCurrentView("gravacao")
  }

  const handleCloseRecording = () => {
    setRecordingPanelOpen(false)
    setCurrentRecordingId(null)
    setCurrentView("main")
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardSidebar 
        open={sidebarOpen} 
        setOpen={setSidebarOpen}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-auto w-full">
          <DashboardMain 
            currentView={currentView} 
            onStartRecording={handleStartRecording}
            onCloseRecording={handleCloseRecording}
            recordingPanelOpen={recordingPanelOpen}
            currentRecordingId={currentRecordingId}
            onViewChange={setCurrentView}
          />
        </div>
      </div>
    </div>
  )
}
