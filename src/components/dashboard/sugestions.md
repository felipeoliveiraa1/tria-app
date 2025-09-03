# 🧠 Prompt — Sidebar de **Sugestões de Perguntas (IA)** ao lado da Transcrição (Next.js + OpenAI Responses API)

> Objetivo: criar uma **caixa lateral** fixa com **sugestões de perguntas** baseadas na transcrição em andamento **e** no que falta na Anamnese.  
> – Usa **OpenAI Responses API** com **Structured Output (JSON Schema)**.  
> – Busca contexto recente em `utterances` (Paciente/Médico) e o estado `consultations.anamnese`.  
> – Atualiza sozinha a cada 10s e tem botão **Regenerar** manual.  
> – Ao clicar em “Perguntar”, copia o texto sugerido (ou você pode integrar com o seu fluxo de fala).

---

## 0) Pré-requisitos (.env)
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 1) Prompt/Schema para as sugestões
**File:** `src/lib/suggestions-prompts.ts`
```ts
export const SUGGESTIONS_SYSTEM_PROMPT = `
Você é um assistente clínico que sugere perguntas de anamnese (pt-BR).
Use o contexto (fala recente e estado da anamnese) para propor perguntas que maximizem a informação clínica útil.
Regra de ouro:
- Priorize campos essenciais não preenchidos ou com confidence < 0.7.
- Evite repetir o que já está confirmado.
- Mantenha perguntas claras, abertas quando necessário, e direcionadas quando já há pistas.

Categorias permitidas: ["Identificação","QP","HMA","AP","AF","IDA","Clareamento/Empatia","Conduta"].

Devolva JSON ESTRITO conforme schema. Não inclua explicações fora do JSON.
`;

export const suggestionsJsonSchema = {
  name: "SuggestionsPayload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      suggestions: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            category: { type: "string" },
            priority: { type: "integer", minimum: 1, maximum: 5 },
            rationale: { type: "string" },
            targets: {
              type: "array",
              items: { type: "string" } // ids de campos da anamnese (ex: "hma.localizacao")
            }
          },
          required: ["id","text","category","priority"]
        }
      }
    },
    required: ["suggestions"]
  }
};
2) Rota de IA: gera sugestões a partir do contexto
File: src/app/api/suggestions/route.ts

ts
Copiar código
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { suggestionsJsonSchema, SUGGESTIONS_SYSTEM_PROMPT } from '@/lib/suggestions-prompts';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Body = {
  consultationId?: string;
  transcriptWindow?: string; // opcional: se você quiser mandar manualmente um trecho consolidado
  maxUtterances?: number;    // default 30
  minutesLookback?: number;  // default 6
};

export async function POST(req: Request) {
  try {
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

    // 3) Chamar Responses API (Structured Output)
    const input = [
      { role: 'system', content: SUGGESTIONS_SYSTEM_PROMPT },
      { role: 'user', content: `Estado atual da anamnese (JSON, pode ser null):\n${JSON.stringify(anamneseState)}` },
      { role: 'user', content: `Fala recente (ordem temporal):\n${transcript}` },
      { role: 'user', content: `Tarefa: gere 3 a 6 perguntas úteis e priorizadas (1=alta). Use categorias válidas. Evite repetir o que está confirmado.` },
    ] as any[];

    const resp = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input,
      response_format: { type: 'json_schema', json_schema: suggestionsJsonSchema },
    });

    // 4) Parse
    let payload: any = null;
    try {
      payload = JSON.parse(resp.output_text!);
    } catch (e) {
      return json({ error: 'Falha ao parsear JSON de sugestões', raw: resp.output_text }, 502);
    }

    return json(payload);
  } catch (e: any) {
    return json({ error: e?.message ?? 'Erro interno' }, 500);
  }
}

function json(payload: any, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
Obs. Se você ainda não criou supabase-admin.ts, crie:

ts
Copiar código
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
3) Componente React (sidebar fixa) de sugestões
File: src/components/consultations/SuggestedQuestions.tsx

tsx
Copiar código
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Suggestion = {
  id: string;
  text: string;
  category: string;
  priority: number; // 1=alta
  rationale?: string;
  targets?: string[];
};

type Props = {
  consultationId?: string;            // use se quiser que o server puxe utterances/anamnese
  transcriptWindow?: string;          // ou mande um trecho consolidado você mesmo
  autoRefreshMs?: number;             // default 10000
  onAsk?: (q: string) => void;        // callback quando o usuário clicar "Perguntar"
};

export default function SuggestedQuestions({
  consultationId,
  transcriptWindow,
  autoRefreshMs = 10000,
  onAsk
}: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canFetch = useMemo(
    () => Boolean(consultationId || (transcriptWindow && transcriptWindow.trim().length > 0)),
    [consultationId, transcriptWindow]
  );

  const fetchSuggestions = useCallback(async () => {
    if (!canFetch) return;
    try {
      setLoading(true);
      setError(null);
      const r = await fetch('/api/suggestions', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId, transcriptWindow }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `Erro ${r.status}`);
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao gerar sugestões');
    } finally {
      setLoading(false);
    }
  }, [canFetch, consultationId, transcriptWindow]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    if (!autoRefreshMs || !canFetch) return;
    const t = setInterval(fetchSuggestions, autoRefreshMs);
    return () => clearInterval(t);
  }, [autoRefreshMs, fetchSuggestions, canFetch]);

  function copy(text: string) {
    try { navigator.clipboard.writeText(text); } catch {}
  }

  return (
    <aside className="md:sticky md:top-2 h-fit md:h-[calc(100vh-1rem)] overflow-auto rounded-xl border p-4 space-y-3 min-w-[300px]">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">💡 Sugestões de Perguntas (IA)</h3>
        <div className="flex gap-2">
          <button className="text-xs rounded border px-2 py-1" onClick={fetchSuggestions} disabled={loading}>
            {loading ? 'Gerando…' : 'Regenerar'}
          </button>
        </div>
      </header>

      {error && (
        <div className="text-xs text-red-600 border border-red-200 rounded p-2 bg-red-50">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {suggestions.length === 0 && !loading && (
          <div className="text-xs opacity-60">Sem sugestões no momento.</div>
        )}

        {suggestions
          .sort((a,b) => a.priority - b.priority)
          .map((s) => (
          <div key={s.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] px-2 py-0.5 rounded border">
                {s.category} • P{String(s.priority)}
              </span>
              {s.targets?.length ? (
                <span className="text-[10px] opacity-60">{s.targets.join(', ')}</span>
              ) : null}
            </div>
            <div className="text-sm mt-2">{s.text}</div>
            {s.rationale && (
              <div className="text-[11px] opacity-60 mt-1">{s.rationale}</div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                className="text-xs rounded border px-2 py-1"
                onClick={() => { onAsk?.(s.text); copy(s.text); }}
                title="Copiar e usar"
              >
                Perguntar
              </button>
              <button
                className="text-xs rounded border px-2 py-1"
                onClick={() => copy(s.text)}
              >
                Copiar
              </button>
            </div>
          </div>
        ))}
      </div>
      <footer className="text-[10px] opacity-60">
        Atualiza automaticamente a cada {Math.round((autoRefreshMs || 0)/1000)}s.
      </footer>
    </aside>
  );
}
4) Como posicionar “ao lado da transcrição”
No seu page (ex.: src/app/dashboard/nova-consulta/page.tsx) onde já existe a transcrição, use um grid de 2 colunas:

tsx
Copiar código
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import SuggestedQuestions from '@/components/consultations/SuggestedQuestions';

export default function NovaConsultaPage({ searchParams }: { searchParams: { consultationId?: string } }) {
  const consultationId = searchParams?.consultationId;

  return (
    <main className="p-6">
      <div className="grid md:grid-cols-[1fr,360px] gap-6">
        {/* Coluna esquerda: SUA transcrição já existente */}
        <section className="space-y-4">
          {/* ... seu componente de transcrição ao vivo ... */}
        </section>

        {/* Coluna direita: Sugestões IA */}
        <SuggestedQuestions
          consultationId={consultationId}
          autoRefreshMs={10000}
          onAsk={(q) => {
            // opcional: focar o input de pergunta/ler em voz alta etc.
            console.log('Pergunta sugerida:', q);
          }}
        />
      </div>
    </main>
  );
}
Se você preferir mandar um texto consolidado manualmente (em vez de consultationId), passe transcriptWindow="..." e remova consultationId. A API usará o texto fornecido.

5) Ajustes e dicas
Frequência: 10s é bom para não saturar a API; reduza se quiser mais “ao vivo”.

Precisão: se quiser dar mais contexto, aumente minutesLookback no POST para 10–15 min.

Anamnese: quanto mais você mantiver consultations.anamnese atualizada (via seu pipeline de extração), melhor a priorização.

Privacidade: mantenha essa rota como dynamic = 'force-dynamic' e com Cache-Control: no-store.

makefile
Copiar código
::contentReference[oaicite:0]{index=0}