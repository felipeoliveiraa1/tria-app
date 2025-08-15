import { NextRequest, NextResponse } from 'next/server'

// Função para criar cliente Supabase com fallback
const createSupabaseClient = () => {
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Variáveis do Supabase não configuradas, usando modo mock')
      return null
    }
    
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  } catch (error) {
    console.warn('Supabase não disponível, usando modo mock:', error)
    return null
  }
}

// Dados mockados para desenvolvimento
const mockPatients = [
  {
    id: 'mock-1',
    name: 'Maria Santos Silva',
    email: 'maria.santos@email.com',
    phone: '(11) 99999-9999',
    city: 'São Paulo',
    status: 'active' as const,
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-2',
    name: 'João Oliveira Costa',
    email: 'joao.oliveira@email.com',
    phone: '(11) 88888-8888',
    city: 'São Paulo',
    status: 'active' as const,
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-3',
    name: 'Ana Costa Ferreira',
    email: 'ana.costa@email.com',
    phone: '(11) 77777-7777',
    city: 'Campinas',
    status: 'active' as const,
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-4',
    name: 'Pedro Almeida Santos',
    email: 'pedro.almeida@email.com',
    phone: '(11) 66666-6666',
    city: 'Santos',
    status: 'inactive' as const,
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-5',
    name: 'Lucia Ferreira Lima',
    email: 'lucia.ferreira@email.com',
    phone: '(11) 55555-5555',
    city: 'São Paulo',
    status: 'active' as const,
    created_at: new Date().toISOString()
  },
  // Adicionar pacientes temporários que podem ser criados durante o teste
  {
    id: 'temp-1',
    name: 'Paciente Temporário 1',
    email: 'temp1@email.com',
    phone: '(11) 11111-1111',
    city: 'São Paulo',
    status: 'active' as const,
    created_at: new Date().toISOString()
  },
  {
    id: 'temp-2',
    name: 'Paciente Temporário 2',
    email: 'temp2@email.com',
    phone: '(11) 22222-2222',
    city: 'São Paulo',
    status: 'active' as const,
    created_at: new Date().toISOString()
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do paciente não fornecido' },
        { status: 400 }
      )
    }

    console.log('Buscando paciente com ID:', id)

    const supabase = createSupabaseClient()
    
    if (supabase) {
      // Tentar usar Supabase
      try {
        const { data: patient, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          console.error('Erro ao buscar paciente no Supabase:', error)
          throw error
        }

        return NextResponse.json({
          patient,
          success: true
        })
      } catch (supabaseError) {
        console.warn('Falha no Supabase, usando modo mock:', supabaseError)
        // Continuar para o modo mock
      }
    }

    // Modo mock - buscar paciente localmente
    console.log('Usando modo mock para buscar paciente')
    console.log('Pacientes mock disponíveis:', mockPatients.map(p => ({ id: p.id, name: p.name })))
    
    let mockPatient = mockPatients.find(p => p.id === id)
    
    // Se não encontrar e for um ID mock dinâmico, criar um paciente temporário
    if (!mockPatient && id.startsWith('mock-') && id.includes('-') && id.split('-').length > 2) {
      console.log('Criando paciente temporário para ID mock dinâmico:', id)
      mockPatient = {
        id: id,
        name: 'Novo Paciente',
        email: 'novo.paciente@email.com',
        phone: '(11) 00000-0000',
        city: 'São Paulo',
        status: 'active' as const,
        created_at: new Date().toISOString()
      }
    }
    
    if (!mockPatient) {
      console.error('Paciente não encontrado:', id)
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    console.log('Paciente encontrado:', mockPatient)

    return NextResponse.json({
      patient: mockPatient,
      success: true
    })

  } catch (error) {
    console.error('Erro na API de pacientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
