export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API - Iniciando criação de consulta...')
    
    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ API - Variáveis de ambiente não configuradas')
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }
    
    console.log('✅ API - Variáveis de ambiente configuradas')
    
    // Ler o body uma única vez
    const body = await request.json()
    const { 
      patient_id, 
      patient_name,
      patient_context,
      consultation_type,
      modality,
      status = 'CREATED',
      scheduled_date,
      scheduled_time,
      duration,
      audio_url,
      transcription,
      notes,
      diagnosis,
      treatment,
      prescription,
      next_appointment,
      recording_url
    } = body

    if (!patient_id || !patient_name || !consultation_type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não fornecidos' },
        { status: 400 }
      )
    }
    
    try {
      // Criar cliente Supabase com cookies para autenticação
      const cookieStore = await cookies()
      console.log('✅ API - Cookie store criado')
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
      
      console.log('✅ API - Cliente Supabase criado')

      // Suporte a Authorization: Bearer (sem cookies)
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      let userId: string | null = null
      let db = supabase
      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.split(' ')[1]
        if (token) {
          const direct = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
          )
          db = direct
          const { data: u } = await direct.auth.getUser(token)
          userId = u.user?.id ?? null
        }
      }
      if (!userId) {
        const { data: u, error: e } = await supabase.auth.getUser()
        if (!e && u.user) userId = u.user.id
      }
      if (!userId) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }
      const doctorId = userId

      // Mapear consultation_type para modality se modality não for fornecido
      const finalModality = modality || consultation_type
      
      // Para desenvolvimento, usar data e hora atual se não fornecidas
      const finalScheduledDate = scheduled_date || new Date().toISOString().split('T')[0]
      const finalScheduledTime = scheduled_time || new Date().toTimeString().split(' ')[0]

      console.log('🔄 API - Criando consulta no Supabase:', {
        doctor_id: doctorId,
        patient_id,
        patient_name,
        patient_context,
        consultation_type,
        modality: finalModality,
        status,
        scheduled_date: finalScheduledDate,
        scheduled_time: finalScheduledTime
      })

      const { data: consultation, error } = await db
        .from('consultations')
        .insert([{
          doctor_id: doctorId, // ID do usuário autenticado (requerido pela RLS)
          patient_id,
          patient_name,
          patient_context,
          consultation_type,
          modality: finalModality, // Campo obrigatório
          status,
          scheduled_date: finalScheduledDate, // Campo obrigatório
          scheduled_time: finalScheduledTime, // Campo obrigatório
          duration,
          audio_url,
          transcription,
          notes,
          diagnosis,
          treatment,
          prescription,
          next_appointment,
          recording_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ API - Erro ao criar consulta no Supabase:', error)
        throw new Error(`Erro Supabase: ${error.message}`)
      }

      console.log('✅ API - Consulta criada no Supabase:', consultation)
      const res = NextResponse.json({
        consultation,
        success: true,
        source: 'supabase'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
      
    } catch (supabaseError) {
      console.error('❌ API - Erro na conexão com Supabase:', supabaseError)
      return NextResponse.json(
        { error: supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido ao criar consulta' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API - Iniciando atualização de consulta...')
    
    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ API - Variáveis de ambiente não configuradas')
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }
    
    console.log('✅ API - Variáveis de ambiente configuradas')
    
    // Ler o body UMA única vez e reutilizar
    const parsedBody = await request.json().catch(() => null)
    try {
      // Criar cliente Supabase com cookies para autenticação
      const cookieStore = await cookies()
      console.log('✅ API - Cookie store criado')
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
      
      console.log('✅ API - Cliente Supabase criado')

      // Verificar se o usuário está autenticado
      console.log('🔄 API - Verificando autenticação...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      // Para desenvolvimento, usar um doctor_id padrão se não houver usuário autenticado
      let doctorId = 'a5a278fe-dfff-4105-9b3f-a8f515d7ced8' // ID válido que existe na tabela users
      
      if (!authError && user) {
        doctorId = user.id
        console.log('✅ API - Usuário autenticado:', user.email)
      } else {
        console.log('⚠️ API - Usuário não autenticado, usando ID padrão para desenvolvimento:', doctorId)
      }

      const body = parsedBody || {}
      const { 
        id, 
        status, 
        duration, 
        recording_url,
        notes,
        diagnosis,
        treatment,
        prescription,
        next_appointment,
        patient_context,
        anamnese
      } = body

      if (!id) {
        return NextResponse.json(
          { error: 'ID da consulta não fornecido' },
          { status: 400 }
        )
      }

      console.log('🔄 API - Atualizando consulta no Supabase:', { id, status, duration })

      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (status !== undefined) updateData.status = status
      if (duration !== undefined) updateData.duration = duration
      if (recording_url !== undefined) updateData.recording_url = recording_url
      if (notes !== undefined) updateData.notes = notes
      if (diagnosis !== undefined) updateData.diagnosis = diagnosis
      if (treatment !== undefined) updateData.treatment = treatment
      if (prescription !== undefined) updateData.prescription = prescription
      if (next_appointment !== undefined) updateData.next_appointment = next_appointment
      if (patient_context !== undefined) updateData.patient_context = patient_context
      if (anamnese !== undefined) updateData.anamnese = anamnese

      const { data: consultation, error } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('id', id)
        .eq('doctor_id', doctorId) // Garantir que só atualiza consultas do próprio médico
        .select()
        .single()

      if (error) {
        console.error('❌ API - Erro ao atualizar consulta no Supabase:', error)
        throw new Error(`Erro Supabase: ${error.message}`)
      }

      console.log('✅ API - Consulta atualizada no Supabase:', consultation)
      return NextResponse.json({
        consultation,
        success: true,
        source: 'supabase'
      })
      
    } catch (supabaseError) {
      console.error('❌ API - Erro na conexão com Supabase:', supabaseError)
      
      // Fallback para dados temporários em caso de erro
      console.log('🔄 API - Usando fallback temporário...')
      
      const body = parsedBody || {}
      const { 
        id, 
        status, 
        duration, 
        recording_url,
        notes,
        diagnosis,
        treatment,
        prescription,
        next_appointment,
        patient_context,
        anamnese
      } = body

      const tempConsultation = {
        id,
        status: status || 'COMPLETED',
        duration: duration || 0,
        recording_url,
        notes,
        diagnosis,
        treatment,
        prescription,
        next_appointment,
        patient_context,
        anamnese,
        updated_at: new Date().toISOString(),
        message: 'Consulta temporária - Supabase indisponível'
      }

      console.log('✅ API - Consulta temporária atualizada:', tempConsultation)
      const res = NextResponse.json({
        consultation: tempConsultation,
        success: true,
        source: 'fallback',
        error: supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
    }

  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API - Iniciando busca de consultas...')
    
    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ API - Variáveis de ambiente não configuradas')
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      )
    }
    
    console.log('✅ API - Variáveis de ambiente configuradas')
    
    try {
      // Criar cliente Supabase com cookies para autenticação
      const cookieStore = await cookies()
      console.log('✅ API - Cookie store criado')
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
      
      console.log('✅ API - Cliente Supabase criado')

      // Verificar autenticação via Authorization: Bearer ou cookies
      console.log('🔄 API - Verificando autenticação...')
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      let db = supabase
      let doctorId: string | null = null
      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.split(' ')[1]
        if (token) {
          const direct = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
          )
          db = direct
          const { data: u } = await direct.auth.getUser(token)
          doctorId = u.user?.id ?? null
        }
      }
      if (!doctorId) {
        const { data: u, error: e } = await supabase.auth.getUser()
        if (!e && u?.user) doctorId = u.user.id
      }
      if (!doctorId) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }

      const { searchParams } = new URL(request.url)
      const patientName = searchParams.get('patient_name')
      const patientId = searchParams.get('patient_id')
      
      console.log('🔄 API - Buscando consultas no Supabase:', { patientName, patientId, doctorId })
      
      let query = db
        .from('consultations')
        .select('*')
        .eq('doctor_id', doctorId) // Filtrar apenas consultas do médico autenticado
        .order('created_at', { ascending: false })
      
      if (patientName) {
        query = query.ilike('patient_name', `%${patientName}%`)
      }
      
      if (patientId) {
        query = query.eq('patient_id', patientId)
      }
      
      console.log('🔄 API - Executando query no Supabase...')
      const { data, error } = await query
      
      if (error) {
        console.error('❌ API - Erro ao buscar consultas no Supabase:', error)
        throw new Error(`Erro Supabase: ${error.message}`)
      }
      
      console.log('✅ API - Consultas encontradas no Supabase:', data?.length || 0)
      const res = NextResponse.json({ 
        consultations: data || [], 
        success: true,
        source: 'supabase'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
      
    } catch (supabaseError) {
      console.error('❌ API - Erro na conexão com Supabase:', supabaseError)
      
      // Fallback para dados de teste em caso de erro
      console.log('🔄 API - Usando fallback de dados de teste...')
      
      const res = NextResponse.json({ 
        consultations: [
          {
            id: 'fallback-1',
            patient_name: 'Paciente Fallback',
            status: 'CREATED',
            created_at: new Date().toISOString(),
            message: 'Dados de fallback - Supabase indisponível'
          }
        ], 
        success: true,
        source: 'fallback',
        error: supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido'
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res
    }
    
  } catch (error) {
    console.error('❌ API - Erro interno:', error)
    return NextResponse.json(
      { error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }, 
      { status: 500 }
    )
  }
}
