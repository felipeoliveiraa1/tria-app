# 🚑 Telemedicina v1 — Captura de Aba (áudio) + Transcrição + Extração IA (JSON Schema)

> Implementa a seleção de **aba do navegador** (com áudio) para teleconsulta.  
> A cada 3–5s gravamos um bloco e enviamos para o servidor, que **transcreve** e **atualiza a anamnese** via **Responses API** (Structured Output).

## ✅ Pré-requisitos (.env)
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 1) Componente: selecionar aba da call e enviar blocos
**File:** `src/components/telemed/TabCaptureTranscriber.tsx`
```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

type Props = { consultationId: string };

export default function TabCaptureTranscriber({ consultationId }: Props) {
  const [stream, setStream] = useState<MediaStream|null>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timesliceMs = 3500; // ~3.5s

  async function pickTab() {
    try {
      // IMPORTANTE: no Chrome/Edge o usuário deve marcar "Compartilhar áudio" da aba
      const s = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      // desliga o vídeo para economizar CPU (só precisamos de áudio)
      s.getVideoTracks().forEach(t => t.stop()); // ou mantenha se quiser mini preview
      setStream(s);
    } catch (e) {
      alert('Não foi possível capturar a aba. Verifique permissões e marque "compartilhar áudio".');
    }
  }

  function start() {
    if (!stream) return;
    if (recording) return;
    const mime = pickMimeType();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        // envia blocos conforme chegam
        uploadChunk(e.data).catch(console.error);
      }
    };
    rec.onstop = () => { /* opcional: flush final */ };
    rec.start(timesliceMs);
    setRecording(true);

    // se o usuário parar o compartilhamento da aba, paramos também
    stream.getAudioTracks().forEach(track => {
      track.onended = () => stop();
    });
  }

  function stop() {
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
  }

  async function uploadChunk(blob: Blob) {
    const fd = new FormData();
    fd.append('audio', blob, `tab-${Date.now()}.webm`);
    fd.append('consultationId', consultationId);

    const r = await fetch('/api/telemed/ingest', {
      method: 'POST',
      body: fd,
      cache: 'no-store',
    });
    if (!r.ok) {
      const t = await r.text();
      console.warn('Falha no ingest:', r.status, t);
    }
  }

  function pickMimeType(): string | '' {
    const cand = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg'
    ];
    // @ts-ignore
    if (typeof MediaRecorder === 'undefined') return '';
    // @ts-ignore
    for (const c of cand) if (MediaRecorder.isTypeSupported?.(c)) return c;
    return '';
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="text-lg font-semibold">Teleconsulta (captura de aba)</h3>
      <p className="text-sm opacity-70">
        Selecione a aba da videoconferência e marque <b>Compartilhar áudio</b>.
        Recomendado: Chrome/Edge.
      </p>
      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-1" onClick={pickTab}>
          Escolher aba
        </button>
        <button className="rounded-md border px-3 py-1" onClick={start} disabled={!stream || recording}>
          🎙️ Iniciar captação
        </button>
        <button className="rounded-md border px-3 py-1" onClick={stop} disabled={!recording}>
          ⏹️ Parar
        </button>
      </div>
      <div className="text-xs opacity-70">
        Status: {stream ? (recording ? 'Gravando...' : 'Aguardando iniciar') : 'Nenhuma aba selecionada'}
      </div>
      <ConsentNote />
    </div>
  );
}

function ConsentNote() {
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
      Ao iniciar, você confirma que informou o paciente e obteve consentimento para gravação/transcrição da teleconsulta.
    </div>
  );
}
2) Rota: recebe bloco de áudio, transcreve e extrai anamnese
File: src/app/api/telemed/ingest/route.ts

ts
Copiar
Editar
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { anamneseJsonSchema, emptyState, mergeAnamnese, AnamneseState } from '@/lib/anamnese-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EXTRACT_SYSTEM = `
Você é um extrator clínico. Dado um trecho de fala (pt-BR), atualize um JSON de Anamnese.
Nunca invente. Preencha {value, confidence (0-1), evidence_text, confirmed}.
Não altere campos já confirmados=true no estado atual.
`;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return error({ error: 'Use multipart/form-data' }, 415);
    }
    const form = await req.formData();
    const file = form.get('audio') as File | null;
    const consultationId = (form.get('consultationId') as string) || '';

    if (!file) return error({ error: 'audio é obrigatório' }, 400);

    // 1) Transcrever (WebM Opus/MP4/MP3 suportados)
    const transcript = await openai.audio.transcriptions.create({
      // modelos possíveis: 'whisper-1', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'
      model: 'whisper-1',
      file,
      language: 'pt',
      response_format: 'json',
      temperature: 0,
    });
    const text = (transcript as any).text as string;

    // 2) Carregar estado atual
    let current: AnamneseState;
    if (consultationId) {
      const { data, error: qErr } = await supabaseAdmin
        .from('consultations')
        .select('anamnese')
        .eq('id', consultationId)
        .single();
      if (qErr && qErr.code !== 'PGRST116') throw qErr;
      current = (data?.anamnese as AnamneseState) ?? emptyState();
    } else {
      current = emptyState();
    }

    // 3) Responses API com JSON Schema (Structured Output)
    const resp = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: `Estado atual:\n${JSON.stringify(current)}` },
        { role: 'user', content: `Novo trecho transcrito:\n"""${text}"""` },
        { role: 'user', content: 'Retorne o JSON COMPLETO (schema).'}
      ],
      response_format: { type: 'json_schema', json_schema: anamneseJsonSchema },
    });

    const extracted = JSON.parse(resp.output_text!) as AnamneseState;

    // 4) Merge e persistência
    const merged = mergeAnamnese(current, extracted);
    if (consultationId) {
      const { error: upErr } = await supabaseAdmin
        .from('consultations')
        .update({ anamnese: merged })
        .eq('id', consultationId);
      if (upErr) throw upErr;
    }

    return json({ ok: true, text, state: merged });
  } catch (e: any) {
    return error({ error: e?.message ?? 'Erro interno' }, 500);
  }
}

function json(payload: any, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
function error(payload: any, status = 400) { return json(payload, status); }
3) Helper de Supabase (se faltar)
File: src/lib/supabase-admin.ts

ts
Copiar
Editar
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
4) Onde usar
Inclua o componente na sua tela de consulta (ex.: nova-consulta ou na ficha):

tsx
Copiar
Editar
// src/app/dashboard/nova-consulta/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import TabCaptureTranscriber from '@/components/telemed/TabCaptureTranscriber';

export default function NovaConsultaPage({ searchParams }: { searchParams: { consultationId: string } }) {
  const id = searchParams?.consultationId;
  return (
    <main className="p-6 space-y-6">
      <TabCaptureTranscriber consultationId={id} />
      {/* aqui você também pode renderizar a sidebar da Anamnese com o estado vindo do DB */}
    </main>
  );
}
5) Dicas e limites
Navegador: priorize Chrome/Edge e instrua: “Escolha a aba e marque Compartilhar áudio”.

Safari/macOS: não captura áudio da aba — ofereça fallback (captura de microfone apenas ou use um provedor WebRTC embutido).

Latência: blocos de 3–5s equilibram qualidade/tempo de resposta.

Consentimento: registre created_at, IP e consent:true associado à consulta.

Privacidade: defina o bucket de logs como privado; não armazene os blobs long-term se não for necessário.

javascript
Copiar
Editar

Se quiser, eu já encaixo esse fluxo na sua **sidebar de Anamnese** (puxando o `state` atualizado do Supabase para pintar as “bolinhas” por confiança).
::contentReference[oaicite:0]{index=0}