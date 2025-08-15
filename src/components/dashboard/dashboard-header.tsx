"use client"

import { Menu, Bell, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface DashboardHeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page title */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-foreground-secondary">
            Bem-vindo ao TRIA, {user?.user_metadata?.full_name || user?.email || "Usuário"}
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full"></span>
          </Button>
          
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSignOut}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
