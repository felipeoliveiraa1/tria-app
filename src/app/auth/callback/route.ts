import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Prioridades: NEXT_PUBLIC_SITE_URL > VERCEL_URL > origem do request > localhost
  const envSite = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const vercelUrl = process.env.VERCEL_URL?.trim()
  const originFromReq = new URL(request.url).origin

  const origin = envSite
    || (vercelUrl ? `https://${vercelUrl}` : '')
    || originFromReq
    || 'http://localhost:3000'

  return NextResponse.redirect(`${origin}/dashboard`)
} 