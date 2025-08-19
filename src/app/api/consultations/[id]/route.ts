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
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 1]

    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', options) },
      },
    })

    // Suporte a Authorization: Bearer
    const authHeader = (request as any).headers?.get?.('authorization') || (request as any).headers?.get?.('Authorization')
    let db = supabase
    let doctorId: string | null = null
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token) {
        const direct = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } })
        db = direct
        const { data: u } = await direct.auth.getUser(token)
        doctorId = u.user?.id ?? null
      }
    }
    if (!doctorId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: consultation, error } = await db
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('doctor_id', doctorId)
      .maybeSingle()

    if (error) {
      // Tratar erro de not found do PostgREST como 404
      const message = (error as any)?.message || 'Erro ao buscar consulta'
      const isNotFound = message?.toString().toLowerCase().includes('not found') || (error as any)?.code === 'PGRST116'
      const status = isNotFound ? 404 : 500
      return NextResponse.json({ error: message }, { status })
    }

    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ consultation, success: true, source: 'supabase' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
