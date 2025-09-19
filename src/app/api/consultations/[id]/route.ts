export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 1]

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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const { data: consultation, error } = await supabase
      .from('consultations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('doctor_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: `Erro ao cancelar consulta: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Consulta cancelada com sucesso', source: 'supabase' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    console.log('🔄 API - Iniciando busca de consulta...')
    
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 1]
    
    console.log('🔄 API - ID da consulta:', id)

    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ API - Variáveis do Supabase não configuradas')
      return NextResponse.json({ 
        error: 'Configuração do Supabase não encontrada',
        message: 'Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', options) },
      },
    })

    // Suporte a Authorization: Bearer OU cookies
    const authHeader = (request as any).headers?.get?.('authorization') || (request as any).headers?.get?.('Authorization')
    console.log('🔄 API - Auth header presente:', !!authHeader)
    
    let db = supabase
    let doctorId: string | null = null
    
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token) {
        console.log('🔄 API - Usando token Bearer')
        const direct = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } })
        db = direct
        const { data: u } = await direct.auth.getUser(token)
        doctorId = u.user?.id ?? null
        console.log('🔄 API - Doctor ID do token:', doctorId)
      }
    }
    
    if (!doctorId) {
      console.log('🔄 API - Tentando autenticação por cookies')
      const { data: u, error: e } = await supabase.auth.getUser()
      if (!e && u?.user) {
        doctorId = u.user.id
        console.log('🔄 API - Doctor ID dos cookies:', doctorId)
      } else {
        console.warn('⚠️ API - Erro na autenticação por cookies:', e)
      }
    }
    
    if (!doctorId) {
      console.error('❌ API - Usuário não autenticado')
      return NextResponse.json({ 
        error: 'Usuário não autenticado',
        message: 'Faça login para acessar esta consulta'
      }, { status: 401 })
    }

    console.log('🔄 API - Buscando consulta no Supabase...')
    const { data: consultation, error } = await db
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .maybeSingle()

    if (error) {
      console.error('❌ API - Erro ao buscar consulta:', error)
      // Tratar erro de not found do PostgREST como 404
      const message = (error as any)?.message || 'Erro ao buscar consulta'
      const isNotFound = message?.toString().toLowerCase().includes('not found') || (error as any)?.code === 'PGRST116'
      const status = isNotFound ? 404 : 500
      return NextResponse.json({ error: message }, { status })
    }

    if (!consultation) {
      console.warn('⚠️ API - Consulta não encontrada no banco')
      return NextResponse.json({ 
        error: 'Consulta não encontrada',
        message: 'Esta consulta não existe ou você não tem permissão para acessá-la'
      }, { status: 404 })
    }

    console.log('✅ API - Consulta encontrada:', consultation.id)
    const res = NextResponse.json({ consultation, success: true, source: 'supabase' })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
