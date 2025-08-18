import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const consultationId = url.searchParams.get('consultation_id')

    if (!id && !consultationId) {
      return NextResponse.json({ error: 'Parâmetro id ou consultation_id é obrigatório' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
          remove(name: string, options: any) { cookieStore.set(name, '', options) },
        },
      }
    )

    // Suporte a Authorization: Bearer
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let db = supabase
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token) {
        db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
      }
    }

    // Buscar registro do áudio respeitando RLS
    let query = db.from('audio_files').select('id, storage_path, storage_bucket, mime_type, file_name, filename, uploaded_at')
    if (id) query = query.eq('id', id)
    if (consultationId) query = query.eq('consultation_id', consultationId).order('uploaded_at', { ascending: false }).limit(1)

    const { data: rows, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const audio = Array.isArray(rows) ? rows[0] : rows
    if (!audio) {
      return NextResponse.json({ error: 'Áudio não encontrado' }, { status: 404 })
    }

    // Gerar URL assinada com service role para streaming estável
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: signed, error: signErr } = await admin.storage
      .from(audio.storage_bucket || 'audio-files')
      .createSignedUrl(audio.storage_path, 60)

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: signErr?.message || 'Falha ao assinar URL' }, { status: 500 })
    }

    // Buscar o arquivo e repassar o stream
    const proxied = await fetch(signed.signedUrl)
    if (!proxied.ok || !proxied.body) {
      return NextResponse.json({ error: 'Falha ao obter arquivo do storage' }, { status: 502 })
    }

    const headers = new Headers()
    headers.set('Content-Type', audio.mime_type || proxied.headers.get('Content-Type') || 'audio/wav')
    headers.set('Cache-Control', 'private, max-age=60')
    const filename = audio.file_name || audio.filename || 'audio.wav'
    headers.set('Content-Disposition', `inline; filename="${filename}"`)

    return new Response(proxied.body, { status: 200, headers })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}


