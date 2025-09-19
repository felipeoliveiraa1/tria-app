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
      console.warn('⚠️ API - Variáveis do Supabase não configuradas, retornando mock')
      const mockConsultation = {
        id: id,
        doctor_id: 'mock-doctor',
        patient_id: 'mock-patient',
        patient_name: 'Paciente Mock',
        patient_context: 'Contexto mock da consulta',
        consultation_type: 'PRESENCIAL',
        status: 'CREATED',
        duration: null,
        recording_url: null,
        notes: null,
        diagnosis: null,
        treatment: null,
        prescription: null,
        next_appointment: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const res = NextResponse.json({ 
        consultation: mockConsultation, 
        success: true, 
        source: 'mock',
        message: 'Modo mock - Supabase não configurado'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
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
      console.warn('⚠️ API - Usuário não autenticado, retornando mock')
      const mockConsultation = {
        id: id,
        doctor_id: 'mock-doctor',
        patient_id: 'mock-patient',
        patient_name: 'Paciente Mock',
        patient_context: 'Contexto mock da consulta',
        consultation_type: 'PRESENCIAL',
        status: 'CREATED',
        duration: null,
        recording_url: null,
        notes: null,
        diagnosis: null,
        treatment: null,
        prescription: null,
        next_appointment: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const res = NextResponse.json({ 
        consultation: mockConsultation, 
        success: true, 
        source: 'mock',
        message: 'Modo mock - Usuário não autenticado'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
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
      console.warn('⚠️ API - Consulta não encontrada, retornando mock')
      const mockConsultation = {
        id: id,
        doctor_id: doctorId,
        patient_id: 'mock-patient',
        patient_name: 'Paciente Mock',
        patient_context: 'Contexto mock da consulta',
        consultation_type: 'PRESENCIAL',
        status: 'CREATED',
        duration: null,
        recording_url: null,
        notes: null,
        diagnosis: null,
        treatment: null,
        prescription: null,
        next_appointment: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const res = NextResponse.json({ 
        consultation: mockConsultation, 
        success: true, 
        source: 'mock',
        message: 'Modo mock - Consulta não encontrada no banco'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
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
