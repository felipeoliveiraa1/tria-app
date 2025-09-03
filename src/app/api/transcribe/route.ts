export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { broadcastTranscription } from '@/lib/broadcast-transcription'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const speaker = formData.get('speaker') as string
    const consultationId = formData.get('consultationId') as string
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Arquivo de áudio não fornecido' },
        { status: 400 }
      )
    }

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a chave da API está configurada
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('Chave da API OpenAI não configurada')
      
      // Retornar erro em vez de mock
      return NextResponse.json({
        text: '',
        success: false,
        error: 'Chave da API OpenAI não configurada'
      })
    }

    // Converter o arquivo para FormData para enviar para OpenAI
    const openAIFormData = new FormData()
    openAIFormData.append('file', audioFile)
    openAIFormData.append('model', 'whisper-1')
    openAIFormData.append('language', 'pt') // Forçar português
    openAIFormData.append('response_format', 'json')
    openAIFormData.append('prompt', 'Esta é uma consulta médica em português brasileiro. O paciente está falando com o médico sobre seus sintomas e histórico médico.')

    // Enviar para OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openAIFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro da OpenAI:', errorData)
      
      // Retornar erro em vez de mock
      return NextResponse.json({
        text: '',
        success: false,
        error: `Erro na OpenAI: ${errorData.error?.message || 'Erro desconhecido'}`
      })
    }

    const result = await response.json()
    
    // Validar e filtrar o texto transcrito
    const transcribedText = result.text?.trim() || ''
    
    // Filtros para evitar conteúdo estranho
    const invalidPatterns = [
      /[^\p{L}\p{N}\p{P}\p{Z}\s]/u, // Caracteres não-latinos/não-padrão
      /^[^a-zA-ZÀ-ÿ0-9\s]+$/, // Só caracteres especiais
      /дякую|спасибо|thank you|share.*video.*social.*media/i, // Palavras/frases em outras línguas ou spam
      /^[\s\p{P}]*$/u, // Só pontuação e espaços
    ]
    
    const isValidText = transcribedText.length > 0 && 
                       transcribedText.length < 1000 && // Limite razoável
                       !invalidPatterns.some(pattern => pattern.test(transcribedText))
    
    if (!isValidText) {
      console.warn('Texto inválido filtrado:', transcribedText)
      return NextResponse.json({
        text: '', // Retornar vazio se inválido
        success: true,
        mock: false,
        filtered: true
      })
    }

    // Salvar utterance no banco se temos speaker e consultationId
    if (speaker && consultationId && transcribedText.trim()) {
      try {
        console.log('💾 Salvando utterance diretamente:', { consultationId, speaker, textLength: transcribedText.length })
        
        // Salvar diretamente no Supabase
        const { data, error } = await supabaseAdmin
          .from('utterances')
          .insert({
            consultation_id: consultationId,
            speaker,
            text: transcribedText,
            confidence: null,
          })
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Erro ao salvar utterance no banco:', error)
        } else {
          console.log('✅ Utterance salva com sucesso:', data.id)
        }
        
        // Broadcast em tempo real via SSE (sempre, mesmo se não salvou no banco)
        broadcastTranscription(consultationId, {
          type: 'transcription',
          speaker,
          text: transcribedText,
          confidence: null,
          timestamp: Date.now()
        })
        
      } catch (error) {
        console.warn('⚠️ Erro ao salvar utterance:', error)
        
        // Broadcast mesmo em caso de erro
        broadcastTranscription(consultationId, {
          type: 'transcription',
          speaker,
          text: transcribedText,
          confidence: null,
          timestamp: Date.now()
        })
      }
    }
    
    return NextResponse.json({
      text: transcribedText,
      success: true,
      mock: false,
      speaker,
      consultationId
    })

  } catch (error) {
    console.error('Erro na API de transcrição:', error)
    
    // Retornar erro em vez de mock
    return NextResponse.json({
      text: '',
      success: false,
      error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    })
  }
}
