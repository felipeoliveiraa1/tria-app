export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    const { consultationId, participantName, role } = await request.json()

    if (!consultationId || !participantName || !role) {
      return NextResponse.json(
        { error: 'consultationId, participantName e role são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['doctor', 'patient'].includes(role)) {
      return NextResponse.json(
        { error: 'role deve ser "doctor" ou "patient"' },
        { status: 400 }
      )
    }

    // Verificar se as variáveis de ambiente estão configuradas
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    
    console.log('🔍 Verificando variáveis LiveKit:')
    console.log('🔍 LIVEKIT_API_KEY:', apiKey ? '✅ Configurada' : '❌ Não configurada')
    console.log('🔍 LIVEKIT_API_SECRET:', apiSecret ? '✅ Configurada' : '❌ Não configurada')
    console.log('🔍 LIVEKIT_API_KEY valor:', apiKey)
    console.log('🔍 LIVEKIT_API_SECRET valor:', apiSecret ? '***' + apiSecret.slice(-4) : 'undefined')
    console.log('🔍 Todas as variáveis de ambiente:', Object.keys(process.env).filter(key => key.includes('LIVEKIT')))
    
    if (!apiKey || !apiSecret) {
      console.warn('⚠️ Chaves LiveKit não configuradas, usando modo mock')
      console.warn('⚠️ LIVEKIT_API_KEY:', apiKey)
      console.warn('⚠️ LIVEKIT_API_SECRET:', apiSecret ? '***' : 'undefined')
      return NextResponse.json({
        token: 'mock-token-for-development',
        mock: true,
        message: 'Configure LIVEKIT_API_KEY e LIVEKIT_API_SECRET para usar LiveKit'
      })
    }

    console.log('🎫 Gerando token LiveKit para:', { consultationId, participantName, role })

    // Criar token de acesso
    const token = new AccessToken(apiKey, apiSecret, {
      identity: `${role}-${participantName}-${Date.now()}`, // Identidade única
      name: `${role === 'doctor' ? 'Dr.' : 'Paciente'} ${participantName}`,
    })

    // Adicionar permissões para a sala
    token.addGrant({
      room: `consultation-${consultationId}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    })

    const jwt = await token.toJwt()

    console.log('✅ Token LiveKit gerado com sucesso')
    console.log('🔍 Token type:', typeof jwt)
    console.log('🔍 Token length:', jwt?.length || 0)
    console.log('🔍 Token preview:', jwt?.substring(0, 50) + '...')

    return NextResponse.json({
      token: jwt,
      room: `consultation-${consultationId}`,
      identity: `${role}-${participantName}-${Date.now()}`,
      mock: false
    })

  } catch (error) {
    console.error('❌ Erro ao gerar token LiveKit:', error)
    
    // Fallback para modo mock
    return NextResponse.json({
      token: 'mock-token-for-development',
      mock: true,
      error: 'Erro ao gerar token, usando modo mock'
    })
  }
}
