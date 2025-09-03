export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { addConnection, removeConnection } from '@/lib/broadcast-transcription'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const consultationId = searchParams.get('consultationId')

  if (!consultationId) {
    return NextResponse.json(
      { error: 'consultationId é obrigatório' },
      { status: 400 }
    )
  }

  console.log('🔄 Nova conexão SSE para consulta:', consultationId)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Adicionar conexão ao set de conexões ativas
      addConnection(consultationId, controller)

      // Enviar mensagem inicial
      const initMessage = `data: ${JSON.stringify({
        type: 'connected',
        consultationId,
        timestamp: Date.now()
      })}\n\n`
      controller.enqueue(encoder.encode(initMessage))

      // Keepalive a cada 30 segundos
      const keepAlive = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          })}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          clearInterval(keepAlive)
        }
      }, 30000)

      // Cleanup quando a conexão é fechada
      const cleanup = () => {
        clearInterval(keepAlive)
        removeConnection(consultationId, controller)
        console.log('🔌 Conexão SSE fechada para consulta:', consultationId)
      }

      // Escutar sinal de abort do cliente
      request.signal.addEventListener('abort', cleanup)

      // Cleanup quando o stream é fechado
      return cleanup
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    }
  })
}
