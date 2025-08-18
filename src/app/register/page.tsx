"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

export default function RegisterPage() {
  const router = useRouter()
  const { signUpWithEmailPassword, loading } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    try {
      // Se não há SMTP ativo ou o signup padrão falhar, usamos a rota admin
      try {
        const { needsEmailConfirmation } = await signUpWithEmailPassword({ name, email, password })
        if (needsEmailConfirmation) {
          setInfo('Cadastro realizado! Verifique seu e-mail para confirmar sua conta e depois faça login.')
          return
        }
        router.replace('/dashboard')
      } catch (signupErr: any) {
        // Fallback: criar usuário via rota admin (email confirmado automaticamente)
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.error || 'Falha ao criar usuário')
        }
        // Após criar via admin, efetua login
        const loginRes = await fetch('/api/test', { method: 'GET' }).catch(() => null)
        // Usa client direto
        window.location.href = '/login'
        return
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>Use seu e-mail para começar a usar o TRIA</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Senha</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark h-12">
                {loading ? 'Enviando...' : 'Criar conta'}
              </Button>
            </form>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mt-4">{error}</p>
            )}
            {info && (
              <p className="text-sm text-green-600 bg-green-100 p-3 rounded-lg mt-4">{info}</p>
            )}

            <div className="text-center mt-4">
              <button className="text-primary hover:underline" onClick={() => router.push('/login')}>Já tem conta? Entrar</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


