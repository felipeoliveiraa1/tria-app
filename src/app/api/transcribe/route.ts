export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Arquivo de áudio não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se a chave da API está configurada
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('Chave da API OpenAI não configurada, usando modo mock')
      
      // Modo mock - simular transcrição
      const mockTranscription = "Esta é uma transcrição simulada da consulta médica. Em um ambiente de produção, este texto seria gerado pela API da OpenAI usando o modelo Whisper-1."
      
      return NextResponse.json({
        text: mockTranscription,
        success: true,
        mock: true
      })
    }

    // Converter o arquivo para FormData para enviar para OpenAI
    const openAIFormData = new FormData()
    openAIFormData.append('file', audioFile)
    openAIFormData.append('model', 'whisper-1')
    openAIFormData.append('response_format', 'json')

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
      
      // Fallback para modo mock em caso de erro da OpenAI
      const mockTranscription = "Transcrição simulada devido a erro na API da OpenAI. Arquivo de áudio recebido com sucesso."
      
      return NextResponse.json({
        text: mockTranscription,
        success: true,
        mock: true,
        error: 'Erro na OpenAI, usando transcrição simulada'
      })
    }

    const result = await response.json()
    
    return NextResponse.json({
      text: result.text,
      success: true,
      mock: false
    })

  } catch (error) {
    console.error('Erro na API de transcrição:', error)
    
    // Fallback para modo mock em caso de erro geral
    const mockTranscription = "Transcrição simulada devido a erro interno do servidor. Sistema funcionando em modo de demonstração."
    
    return NextResponse.json({
      text: mockTranscription,
      success: true,
      mock: true,
      error: 'Erro interno, usando transcrição simulada'
    })
  }
}
