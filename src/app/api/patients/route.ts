import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    console.log('🔄 API - Buscando pacientes no Supabase:', { page, limit, search, status })

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase não está configurado' },
        { status: 500 }
      )
    }

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Aplicar paginação
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: patients, error, count } = await query

    if (error) {
      console.error('❌ API - Erro ao buscar pacientes no Supabase:', error)
      return NextResponse.json(
        { error: `Erro ao buscar pacientes: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ API - Pacientes encontrados no Supabase:', patients?.length || 0)
    
    return NextResponse.json({
      patients: patients || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
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
