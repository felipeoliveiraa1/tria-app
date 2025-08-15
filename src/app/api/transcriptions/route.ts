import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API - Iniciando criação de transcrição...')
    
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
      consultation_id, 
      raw_text, 
      summary = null,
      key_points = null,
      diagnosis = null,
      treatment = null,
      observations = null,
      confidence = 0.95,
      processing_time = null,
      language = 'pt-BR',
      model_used = 'whisper-1'
    } = body

    // Validar campos obrigatórios
    if (!consultation_id || !raw_text) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não fornecidos: consultation_id, raw_text' },
        { status: 400 }
      )
    }

    console.log('🔄 API - Criando transcrição:', {
      consultation_id,
      raw_text_length: raw_text.length,
      language,
      model_used
    })

    try {
      // Criar cliente Supabase com cookies para autenticação
      const cookieStore = await cookies()
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

      // Verificar se a consulta existe e pertence ao usuário
      const { data: consultation, error: consultationError } = await supabase
        .from('consultations')
        .select('id, doctor_id')
        .eq('id', consultation_id)
        .eq('doctor_id', doctorId)
        .single()

      if (consultationError || !consultation) {
        console.error('❌ API - Consulta não encontrada ou não autorizada:', consultationError)
        return NextResponse.json(
          { error: 'Consulta não encontrada ou não autorizada' },
          { status: 403 }
        )
      }

      const { data: transcription, error } = await supabase
        .from('transcriptions')
        .insert({
          consultation_id,
          content: raw_text, // Campo obrigatório conforme schema
          raw_text,
          summary,
          key_points: key_points ? [key_points] : null, // Converter para array se for string
          diagnosis,
          treatment,
          observations,
          confidence,
          processing_time,
          language,
          model_used,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ API - Erro ao criar transcrição no Supabase:', error)
        throw new Error(`Erro Supabase: ${error.message}`)
      }

      console.log('✅ API - Transcrição criada no Supabase:', transcription)
      return NextResponse.json({
        transcription,
        success: true,
        source: 'supabase'
      })
      
    } catch (supabaseError) {
      console.error('❌ API - Erro na conexão com Supabase:', supabaseError)
      
      // Fallback para dados temporários em caso de erro
      console.log('🔄 API - Usando fallback temporário...')
      
      const tempTranscription = {
        id: `temp-${Date.now()}`,
        consultation_id,
        raw_text,
        summary,
        key_points,
        diagnosis,
        treatment,
        observations,
        confidence,
        processing_time,
        language,
        model_used,
        created_at: new Date().toISOString(),
        message: 'Transcrição temporária - Supabase indisponível'
      }

      console.log('✅ API - Transcrição temporária criada:', tempTranscription)
      return NextResponse.json({
        transcription: tempTranscription,
        success: true,
        source: 'fallback',
        error: supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido'
      })
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

    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultation_id')
    
    console.log('🔄 API - Buscando transcrições no Supabase:', { consultationId })
    
    let query = supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (consultationId) {
      query = query.eq('consultation_id', consultationId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ API - Erro ao buscar transcrições no Supabase:', error)
      return NextResponse.json(
        { error: `Erro ao buscar transcrições: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log('✅ API - Transcrições encontradas no Supabase:', data?.length || 0)
    
    return NextResponse.json({ 
      transcriptions: data || [], 
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
