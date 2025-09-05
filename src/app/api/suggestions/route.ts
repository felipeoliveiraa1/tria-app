import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { suggestionsJsonSchema, SUGGESTIONS_SYSTEM_PROMPT } from '@/lib/suggestions-prompts';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type Body = {
  consultationId?: string;
  transcriptWindow?: string; // opcional: se você quiser mandar manualmente um trecho consolidado
  maxUtterances?: number;    // default 30
  minutesLookback?: number;  // default 6
};

export async function POST(req: Request) {
  try {
    // Verificar se a API key está disponível
    if (!process.env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY não configurada' }, 500);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { consultationId, transcriptWindow, maxUtterances = 30, minutesLookback = 6 } = await req.json() as Body;

    if (!consultationId && !transcriptWindow) {
      return json({ error: 'Informe consultationId ou transcriptWindow' }, 400);
    }

    // 1) Carregar estado atual da anamnese (se houver consultationId)
    let anamneseState: any = null;
    if (consultationId) {
      const { data, error } = await supabaseAdmin
        .from('consultations')
        .select('anamnese')
        .eq('id', consultationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      anamneseState = data?.anamnese ?? null;
    }

    // 2) Montar janela de transcrição (se não enviada)
    let transcript = transcriptWindow?.trim() || '';
    if (!transcript && consultationId) {
      const sinceIso = new Date(Date.now() - minutesLookback * 60_000).toISOString();
      const { data, error } = await supabaseAdmin
        .from('utterances')
        .select('speaker,text,created_at')
        .eq('consultation_id', consultationId)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true })
        .limit(maxUtterances);
      if (error) throw error;

      transcript = (data ?? [])
        .map((r: any) => `[${r.speaker === 'doctor' ? 'Médico' : 'Paciente'}] ${r.text}`)
        .join('\n');
    }

    if (!transcript) {
      return json({ suggestions: [] }); // sem contexto ainda
    }

    // 3) Chamar OpenAI API com Structured Output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SUGGESTIONS_SYSTEM_PROMPT },
        { role: 'user', content: `Estado atual da anamnese (JSON, pode ser null):\n${JSON.stringify(anamneseState)}` },
        { role: 'user', content: `Fala recente (ordem temporal):\n${transcript}` },
        { role: 'user', content: `Tarefa: gere 3 a 6 perguntas úteis e priorizadas (1=alta). Use categorias válidas. Evite repetir o que está confirmado.` },
      ],
      response_format: { 
        type: 'json_schema', 
        json_schema: suggestionsJsonSchema 
      },
      temperature: 0.7,
      max_tokens: 1500
    });

    // 4) Parse
    let payload: any = null;
    try {
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Resposta vazia da OpenAI');
      }
      payload = JSON.parse(responseContent);
    } catch (e) {
      console.error('Erro ao parsear resposta da OpenAI:', e);
      return json({ error: 'Falha ao parsear JSON de sugestões', raw: completion.choices[0]?.message?.content }, 502);
    }

    return json(payload);
  } catch (e: any) {
    console.error('Erro na API de sugestões:', e);
    return json({ error: e?.message ?? 'Erro interno' }, 500);
  }
}

function json(payload: any, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}

