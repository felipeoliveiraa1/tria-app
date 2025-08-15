import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Criar cliente Supabase com cookies para autenticação
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ API - Usuário não autenticado:', authError)
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    console.log('🔄 API - Deletando consulta no Supabase:', id)

    // Marcar como cancelada em vez de deletar (soft delete)
    const { data: consultation, error } = await supabase
      .from('consultations')
      .update({ 
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('doctor_id', user.id) // Garantir que só cancela consultas do próprio médico
      .select()
      .single()

    if (error) {
      console.error('❌ API - Erro ao cancelar consulta no Supabase:', error)
      return NextResponse.json(
        { error: `Erro ao cancelar consulta: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ API - Consulta cancelada no Supabase:', consultation)
    return NextResponse.json({
      success: true,
      message: 'Consulta cancelada com sucesso',
      source: 'supabase'
    })

  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Criar cliente Supabase com cookies para autenticação
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Para desenvolvimento, usar um doctor_id padrão se não houver usuário autenticado
    let doctorId = 'a5a278fe-dfff-4105-9b3f-a8f515d7ced8' // ID válido que existe na tabela users
    
    if (!authError && user) {
      doctorId = user.id
      console.log('✅ API - Usuário autenticado:', user.email)
    } else {
      console.log('⚠️ API - Usuário não autenticado, usando ID padrão para desenvolvimento')
    }

    console.log('🔄 API - Buscando consulta no Supabase:', id)

    const { data: consultation, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('doctor_id', doctorId) // Garantir que só busca consultas do próprio médico
      .single()

    if (error) {
      console.error('❌ API - Erro ao buscar consulta no Supabase:', error)
      return NextResponse.json(
        { error: `Erro ao buscar consulta: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ API - Consulta encontrada no Supabase:', consultation)
    return NextResponse.json({
      consultation,
      success: true,
      source: 'supabase'
    })

  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
