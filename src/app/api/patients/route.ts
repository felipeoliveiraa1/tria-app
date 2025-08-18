import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    console.log('🔄 API - Buscando pacientes no Supabase:', { page, limit, search, status })

    // Criar cliente autenticado via cookies (respeita RLS)
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

    // Suporte a token via Authorization: Bearer
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token) {
        await supabase.auth.setSession({ access_token: token, refresh_token: '' as any })
      }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('doctor_id', user.id)

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
