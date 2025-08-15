import { NextResponse } from 'next/server'

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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 1]

    if (!id) {
      return NextResponse.json(
        { error: 'ID da consulta não fornecido' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()
    
    if (supabase) {
      try {
        const { data: transcription, error } = await supabase
          .from('transcriptions')
          .select('*')
          .eq('consultation_id', id)
          .single()

        if (error) {
          console.error('Erro ao buscar transcrição no Supabase:', error)
          throw error
        }

        return NextResponse.json({
          transcription,
          success: true
        })
      } catch (supabaseError) {
        console.warn('Falha no Supabase, usando modo mock:', supabaseError)
      }
    }

    // Modo mock
    const mockTranscription = {
      id: `mock-transcription-${id}`,
      consultation_id: id,
      raw_text: 'Esta é uma transcrição simulada da consulta médica. Em um ambiente de produção, este texto seria gerado pela API da OpenAI usando o modelo Whisper-1.',
      summary: 'Transcrição simulada da consulta médica',
      key_points: ['Consulta médica', 'Transcrição simulada'],
      diagnosis: null,
      treatment: null,
      observations: null,
      confidence: 0.9,
      processing_time: 30,
      created_at: new Date().toISOString()
    }

    return NextResponse.json({
      transcription: mockTranscription,
      success: true,
      mock: true
    })

  } catch (error) {
    console.error('Erro na API de transcrições:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
