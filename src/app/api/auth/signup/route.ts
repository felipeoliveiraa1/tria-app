import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = body || {}
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(url, serviceKey)

    // 1) Criar usuário no Auth, confirmando o e-mail automaticamente
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })
    if (createError) {
      const status = (createError as any)?.status || 500
      return NextResponse.json({ error: createError.message }, { status })
    }

    const userId = created.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'User created but no id returned' }, { status: 500 })
    }

    // 2) Sincronizar perfil na tabela public.users
    const { error: upsertError } = await admin
      .from('users')
      .upsert({ id: userId, email, name, is_doctor: true, updated_at: new Date().toISOString() })
    if (upsertError) {
      // Não falhar a criação por causa do perfil; apenas registrar
      console.error('signup route - upsert profile error:', upsertError)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('signup route - unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}


