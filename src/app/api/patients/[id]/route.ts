export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Função para criar cliente Supabase com fallback
const createSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )
}

// Dados mockados para desenvolvimento
const mockPatients = [
  { id: 'mock-1', name: 'Maria Santos Silva', email: 'maria.santos@email.com', phone: '(11) 99999-9999', city: 'São Paulo', status: 'active' as const, created_at: new Date().toISOString() },
  { id: 'mock-2', name: 'João Oliveira Costa', email: 'joao.oliveira@email.com', phone: '(11) 88888-8888', city: 'São Paulo', status: 'active' as const, created_at: new Date().toISOString() },
  { id: 'mock-3', name: 'Ana Costa Ferreira', email: 'ana.costa@email.com', phone: '(11) 77777-7777', city: 'Campinas', status: 'active' as const, created_at: new Date().toISOString() },
  { id: 'mock-4', name: 'Pedro Almeida Santos', email: 'pedro.almeida@email.com', phone: '(11) 66666-6666', city: 'Santos', status: 'inactive' as const, created_at: new Date().toISOString() },
  { id: 'mock-5', name: 'Lucia Ferreira Lima', email: 'lucia.ferreira@email.com', phone: '(11) 55555-5555', city: 'São Paulo', status: 'active' as const, created_at: new Date().toISOString() },
  { id: 'temp-1', name: 'Paciente Temporário 1', email: 'temp1@email.com', phone: '(11) 11111-1111', city: 'São Paulo', status: 'active' as const, created_at: new Date().toISOString() },
  { id: 'temp-2', name: 'Paciente Temporário 2', email: 'temp2@email.com', phone: '(11) 22222-2222', city: 'São Paulo', status: 'active' as const, created_at: new Date().toISOString() },
]

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 1]

    if (!id) {
      return NextResponse.json({ error: 'ID do paciente não fornecido' }, { status: 400 })
    }

    const supabase = await createSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    try {
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .eq('doctor_id', user.id)
        .single()

      if (error) throw error

      return NextResponse.json({ patient, success: true })
    } catch (supabaseError) {
      console.warn('Falha no Supabase, usando modo mock:', supabaseError)
    }

    let mockPatient = mockPatients.find(p => p.id === id)
    if (!mockPatient && id.startsWith('mock-') && id.includes('-') && id.split('-').length > 2) {
      mockPatient = { id, name: 'Novo Paciente', email: 'novo.paciente@email.com', phone: '(11) 00000-0000', city: 'São Paulo', status: 'active' as const, created_at: new Date().toISOString() }
    }

    if (!mockPatient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ patient: mockPatient, success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
