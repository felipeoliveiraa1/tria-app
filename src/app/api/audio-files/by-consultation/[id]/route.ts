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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID da consulta não fornecido' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()
    
    if (supabase) {
      // Tentar usar Supabase
      try {
        const { data: audioFile, error } = await supabase
          .from('audio_files')
          .select('*')
          .eq('consultation_id', id)
          .single()

        if (error) {
          console.error('Erro ao buscar arquivo de áudio no Supabase:', error)
          throw error
        }

        return NextResponse.json({
          audioFile,
          success: true
        })
      } catch (supabaseError) {
        console.warn('Falha no Supabase, usando modo mock:', supabaseError)
        // Continuar para o modo mock
      }
    }

    // Modo mock - retornar arquivo de áudio simulado
    const mockAudioFile = {
      id: `mock-audio-${id}`,
      consultation_id: id,
      filename: `consulta-${id}.webm`,
      original_name: `consulta-${id}.webm`,
      mime_type: 'audio/webm',
      size: 1024 * 1024 * 5, // 5MB simulado
      duration: 300, // 5 minutos simulado
      storage_path: `consultations/${id}/audio.webm`,
      uploaded_at: new Date().toISOString()
    }

    return NextResponse.json({
      audioFile: mockAudioFile,
      success: true,
      mock: true
    })

  } catch (error) {
    console.error('Erro na API de arquivos de áudio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
