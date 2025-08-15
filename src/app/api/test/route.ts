import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'API funcionando!',
    timestamp: new Date().toISOString(),
    env: {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado',
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado',
      supabase_service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Não configurado'
    }
  })
}
