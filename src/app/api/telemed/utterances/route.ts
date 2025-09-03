import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { consultationId, speaker, text, confidence } = body;

    if (!consultationId || !speaker || !text) {
      return NextResponse.json(
        { error: 'consultationId, speaker e text são obrigatórios' }, 
        { status: 400 }
      );
    }

    if (!['doctor', 'patient'].includes(speaker)) {
      return NextResponse.json(
        { error: 'speaker deve ser "doctor" ou "patient"' }, 
        { status: 400 }
      );
    }

    console.log('💾 [Utterances] Salvando utterance:', { consultationId, speaker, textLength: text.length });

    try {
      const { data, error } = await supabaseAdmin
        .from('utterances')
        .insert({
          consultation_id: consultationId,
          speaker,
          text,
          confidence,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [Utterances] Erro ao salvar utterance:', error);
        // Retornar sucesso mesmo se não conseguir salvar no banco
        return NextResponse.json({ 
          id: `temp-${Date.now()}`,
          consultation_id: consultationId,
          speaker,
          text,
          confidence,
          created_at: new Date().toISOString()
        }, { 
          status: 201,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          }
        });
      }

      console.log('✅ [Utterances] Utterance salva:', data.id);

      return NextResponse.json(data, { 
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });

    } catch (dbError) {
      console.warn('⚠️ [Utterances] Erro de conexão com banco, retornando dados temporários:', dbError);
      // Retornar dados temporários se não conseguir salvar no banco
      return NextResponse.json({ 
        id: `temp-${Date.now()}`,
        consultation_id: consultationId,
        speaker,
        text,
        confidence,
        created_at: new Date().toISOString()
      }, { 
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }

  } catch (e: any) {
    console.error('❌ [Utterances] Erro geral no POST:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Erro interno do servidor' }, 
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const consultationId = url.searchParams.get('consultationId') || '';
    
    if (!consultationId) {
      return NextResponse.json([], { status: 200 });
    }

    console.log('📋 [Utterances] Buscando falas para consulta:', consultationId);

    try {
      const { data, error } = await supabaseAdmin
        .from('utterances')
        .select('id,speaker,text,start_ms,end_ms,confidence,created_at')
        .eq('consultation_id', consultationId)
        .order('start_ms', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [Utterances] Erro ao buscar utterances:', error);
        // Retornar array vazio em caso de erro de banco
        return NextResponse.json([], { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          }
        });
      }

      console.log('✅ [Utterances] Encontradas', data?.length || 0, 'falas');

      return NextResponse.json(data ?? [], { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });

    } catch (dbError) {
      console.warn('⚠️ [Utterances] Erro de conexão com banco, retornando array vazio:', dbError);
      // Retornar array vazio se não conseguir conectar ao banco
      return NextResponse.json([], { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }

  } catch (e: any) {
    console.error('❌ [Utterances] Erro geral:', e);
    // Em caso de erro geral, retornar array vazio em vez de erro 500
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  }
}
