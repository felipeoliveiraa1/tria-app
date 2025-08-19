"use client"

import { X, Mic, FileText, Users, Settings, LogOut, Plus, Home, CalendarDays, Banknote, BarChart3, FolderClosed, LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

type DashboardView = "main" | "nova-consulta" | "consultas" | "pacientes" | "configuracoes" | "gravacao"

interface DashboardSidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  currentView: DashboardView
  onViewChange: (view: DashboardView) => void
}

export function DashboardSidebar({ open, setOpen, currentView, onViewChange }: DashboardSidebarProps) {
  const { signOut } = useAuth()
  const router = useRouter()

  const navigation = [
    { name: "Home", icon: Home, id: "main" as DashboardView },
    { name: "Nova Consulta", icon: Plus, id: "nova-consulta" as DashboardView },
    { name: "Consultas", icon: Mic, id: "consultas" as DashboardView },
    { name: "Pacientes", icon: Users, id: "pacientes" as DashboardView },
    { name: "Configurações", icon: Settings, id: "configuracoes" as DashboardView },
  ]

  // Adicionar item de gravação se estiver ativo
  if (currentView === "gravacao") {
    navigation.push({ name: "Gravação Ativa", icon: Mic, id: "gravacao" as DashboardView })
  }

  const handleNavigation = (item: typeof navigation[0]) => {
    onViewChange(item.id)
    if (open) setOpen(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform bg-card border-r border-border transition-all duration-300 ease-in-out
        ${open ? 'w-72 translate-x-0' : 'w-16 group/sidebar hover:w-64 lg:translate-x-0'}
        lg:static lg:inset-0 ${open ? '' : ''}
      `}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-3 lg:px-4 border-b border-border overflow-hidden">
            <div className="flex items-center">
              <Logo />
              <span className={`${open ? 'opacity-100 ml-2' : 'opacity-0 ml-0 lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:ml-2'} transition-all text-sm font-medium whitespace-nowrap`}>BETAA</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`lg:hidden ${open ? '' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = currentView === item.id
              const labelCls = `${open ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0 lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:w-auto lg:group-hover/sidebar:ml-3'} transition-all duration-200 whitespace-nowrap`
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item)}
                  title={item.name}
                  className={`
                    group/item flex w-full items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-foreground-secondary hover:bg-accent hover:text-foreground'
                    }
                  `}
                >
                  <item.icon className={`${isActive ? 'text-white' : 'text-foreground-secondary group-hover/item:text-foreground'} h-5 w-5`} />
                  <span className={labelCls}>{item.name}</span>
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              className={`w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10`}
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span className={`${open ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0 lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:w-auto lg:group-hover/sidebar:ml-3'} transition-all duration-200`}>Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
