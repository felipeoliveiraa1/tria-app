export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const livekitVars = {
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? '✅ Configurada' : '❌ Não configurada',
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? '✅ Configurada' : '❌ Não configurada',
      NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL ? '✅ Configurada' : '❌ Não configurada',
    }

    const allLivekitKeys = Object.keys(process.env).filter(key => key.includes('LIVEKIT'))
    
    return NextResponse.json({
      livekit: livekitVars,
      allLivekitKeys,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao verificar variáveis' }, { status: 500 })
  }
}
