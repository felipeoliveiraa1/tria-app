"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { useAuth } from "@/contexts/auth-context"
import { Mail, Lock, Eye, EyeOff, Chrome } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  
  const router = useRouter()
  const { signInWithGoogle, signInWithEmailPassword, user, loading: authLoading } = useAuth()

  // Debug: mostrar estado atual e redirecionar quando autenticado
  useEffect(() => {
    console.log('LoginPage - Estado atual:', { user, authLoading })
    if (!authLoading && user) {
      // Evitar que o usuário fique na tela de login após autenticar
      const t = setTimeout(() => {
        try {
          router.replace('/dashboard')
        } catch {}
      }, 150)
      return () => clearTimeout(t)
    }
  }, [user, authLoading, router])



  // Se estiver carregando autenticação, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se já estiver logado, mostrar botão para ir ao dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Login realizado com sucesso!</h2>
            <p className="text-muted-foreground">Você está logado como: {user.email}</p>
          </div>
          
          <Button 
            onClick={() => {
              console.log('LoginPage - Usuário clicou no botão para ir ao dashboard')
              window.location.href = "/dashboard"
            }}
            className="bg-primary hover:bg-primary-dark text-white px-8 py-4 text-lg font-semibold"
            size="lg"
          >
            🚀 Ir para o Dashboard
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            Se o botão não funcionar, clique{" "}
            <button 
              onClick={() => {
                console.log('LoginPage - Clique manual no link de redirecionamento')
                window.location.href = "/dashboard"
              }} 
              className="text-primary underline"
            >
              aqui
            </button>
          </p>
        </div>
      </div>
    )
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError("")
      console.log('LoginPage - Iniciando login com Google')
      await signInWithGoogle()
    } catch (error) {
      console.error('LoginPage - Erro no login:', error)
      setError("Erro ao fazer login com Google. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.")
      return
    }

    try {
      setLoading(true)
      setError("")
      await signInWithEmailPassword(email, password)
      window.location.href = '/dashboard'
    } catch (error) {
      setError("Erro ao fazer login. Verifique suas credenciais.")
      console.error("Erro no login:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md justify-center">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center">
          <Logo />
          <h1 className="text-2xl font-bold text-foreground mt-4">
            Bem-vindo ao TRIA
          </h1>
          <p className="text-muted-foreground mt-2 mb-6">
            Faça login para acessar seu dashboard
          </p>
        </div>


        {/* Card de Login */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="space-y-4">
            {/* Botão Google */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading || authLoading}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 h-12"
            >
              <Chrome className="h-5 w-5 mr-3" />
              {loading ? "Entrando..." : "Continuar com Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Ou continue com email
                </span>
              </div>
            </div>

            {/* Formulário Email/Senha */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-primary hover:bg-primary-dark h-12"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            {/* Mensagem de Erro */}
            {error && (
              <div className="text-center">
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {error}
                </p>
              </div>
            )}

            {/* Links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <button
                  onClick={() => router.push("/register")}
                  className="text-primary hover:underline font-medium"
                >
                  Criar conta
                </button>
              </p>
              <p className="text-sm text-muted-foreground">
                <button className="text-primary hover:underline font-medium">
                  Esqueceu sua senha?
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Ao fazer login, você concorda com nossos{" "}
            <button className="text-primary hover:underline">Termos de Serviço</button>
            {" "}e{" "}
            <button className="text-primary hover:underline">Política de Privacidade</button>
          </p>
        </div>
      </div>
    </div>
  )
}

