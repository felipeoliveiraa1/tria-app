# 🧩 Prompt — Duo Mic (Presencial) com seleção de **dois microfones** + Transcrição + Supabase (Next.js/App Router)

> Objetivo: capturar **dois microfones simultâneos** (Médico/Paciente), enviar blocos de áudio a cada 3s para o servidor, **transcrever** e **salvar** as falas rotuladas no Supabase (`utterances`).  
> ✅ Funciona em macOS com múltiplos microfones.  
> 🔔 Recomendado usar **Chrome/Edge**. No macOS, se notar drift entre mics USB, considere um **Aggregate Device** no “Configuração de Áudio MIDI”.

---

## 0) Variáveis de ambiente (.env)
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 1) (SQL) Crie a tabela de falas rotuladas
> Rode no Supabase SQL editor (ou use sua pipeline de migrações).

```sql
create table if not exists public.utterances (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  speaker text not null check (speaker in ('doctor','patient')),
  start_ms integer,
  end_ms integer,
  text text not null,
  confidence numeric,
  created_at timestamptz default now()
);

create index if not exists utterances_consultation_idx
  on public.utterances(consultation_id, created_at);
2) Supabase Admin (server)
File: src/lib/supabase-admin.ts

ts
Copiar
Editar
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
});
3) Rota de ingestão: recebe blob + speaker, transcreve e salva
File: src/app/api/telemed/ingest/route.ts

ts
Copiar
Editar
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function json(payload: any, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('multipart/form-data')) return json({ error: 'Use multipart/form-data' }, 415);

    const form = await req.formData();
    const file = form.get('audio') as File | null;
    const consultationId = (form.get('consultationId') as string) || '';
    const speaker = ((form.get('speaker') as string) || 'patient') as 'doctor'|'patient';

    if (!file) return json({ error: 'audio é obrigatório' }, 400);
    if (!consultationId) return json({ error: 'consultationId é obrigatório' }, 400);

    // 1) Transcrição (modelo: whisper-1; pode trocar por gpt-4o-mini-transcribe)
    const transcript = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
      response_format: 'verbose_json', // inclui segments com timestamps
      temperature: 0,
    });

    const text = (transcript as any).text as string;
    const segments = (transcript as any).segments as Array<{
      start: number; end: number; text: string; confidence?: number;
    }> | undefined;

    // 2) Persistência
    if (segments?.length) {
      const rows = segments.map(s => ({
        consultation_id: consultationId,
        speaker,
        start_ms: Math.round((s.start ?? 0) * 1000),
        end_ms: Math.round((s.end ?? 0) * 1000),
        text: s.text ?? '',
        confidence: s.confidence ?? null,
      }));
      const { error: upErr } = await supabaseAdmin.from('utterances').insert(rows);
      if (upErr) return json({ error: upErr.message }, 400);
    } else {
      const { error: upErr } = await supabaseAdmin.from('utterances').insert({
        consultation_id: consultationId,
        speaker,
        text,
        confidence: null,
      });
      if (upErr) return json({ error: upErr.message }, 400);
    }

    return json({ ok: true, speaker, text, segmentsCount: segments?.length ?? 0 });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Erro interno' }, 500);
  }
}
4) Componente React: captura dois microfones simultâneos (Médico/Paciente)
File: src/components/telemed/DualMicTranscriber.tsx

tsx
Copiar
Editar
'use client';
import { useEffect, useRef, useState } from 'react';

type Opt = { deviceId: string; label: string };
type Props = { consultationId: string };

export default function DualMicTranscriber({ consultationId }: Props) {
  const [devices, setDevices] = useState<Opt[]>([]);
  const [docId, setDocId] = useState<string>('');
  const [patId, setPatId] = useState<string>('');

  const [docStream, setDocStream] = useState<MediaStream|null>(null);
  const [patStream, setPatStream] = useState<MediaStream|null>(null);

  const docRec = useRef<MediaRecorder|null>(null);
  const patRec = useRef<MediaRecorder|null>(null);
  const [recording, setRecording] = useState(false);
  const sliceMs = 3000;

  // Carrega lista de mics (em macOS, precisa pedir permissão antes para ver os labels)
  useEffect(() => {
    (async () => {
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics = list.filter(d => d.kind === 'audioinput').map(d => ({
        deviceId: d.deviceId, label: d.label || 'Microfone'
      }));
      setDevices(mics);

      // restaura seleção anterior
      const lastDoc = localStorage.getItem('tria:mic:doctor') || '';
      const lastPat = localStorage.getItem('tria:mic:patient') || '';
      if (mics.find(m => m.deviceId === lastDoc)) setDocId(lastDoc);
      else if (mics[0]) setDocId(mics[0].deviceId);
      if (mics.find(m => m.deviceId === lastPat)) setPatId(lastPat);
      else if (mics[1]) setPatId(mics[1].deviceId);
    })();
  }, []);

  useEffect(() => { if (docId) localStorage.setItem('tria:mic:doctor', docId); }, [docId]);
  useEffect(() => { if (patId) localStorage.setItem('tria:mic:patient', patId); }, [patId]);

  async function openStreams() {
    if (!docId || !patId) { alert('Selecione os dois microfones.'); return; }
    if (docId === patId) { alert('Escolha microfones distintos para Médico e Paciente.'); return; }

    const base = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,    // um canal por mic
      sampleRate: 48000,  // alvo comum
    } as MediaTrackConstraints;

    const [sDoc, sPat] = await Promise.all([
      navigator.mediaDevices.getUserMedia({ audio: { ...base, deviceId: { exact: docId } } }),
      navigator.mediaDevices.getUserMedia({ audio: { ...base, deviceId: { exact: patId } } }),
    ]);
    setDocStream(sDoc);
    setPatStream(sPat);
  }

  function start() {
    if (!docStream || !patStream || recording) return;
    const dMime = pickMime();
    const pMime = pickMime();

    const d = new MediaRecorder(docStream, dMime ? { mimeType: dMime } : undefined);
    const p = new MediaRecorder(patStream, pMime ? { mimeType: pMime } : undefined);
    docRec.current = d; patRec.current = p;

    d.ondataavailable = e => e.data?.size && upload(e.data, 'doctor');
    p.ondataavailable = e => e.data?.size && upload(e.data, 'patient');

    d.start(sliceMs); p.start(sliceMs);
    setRecording(true);

    // se usuário desconectar algum mic, parar ambos
    [...docStream.getAudioTracks(), ...patStream.getAudioTracks()].forEach(t => {
      t.onended = () => stop();
    });
  }

  function stop() {
    try { docRec.current?.stop(); } catch {}
    try { patRec.current?.stop(); } catch {}
    setRecording(false);
  }

  async function upload(blob: Blob, speaker: 'doctor' | 'patient') {
    const fd = new FormData();
    fd.append('audio', blob, `${speaker}-${Date.now()}.webm`);
    fd.append('consultationId', consultationId);
    fd.append('speaker', speaker);
    const r = await fetch('/api/telemed/ingest', {
      method: 'POST',
      body: fd,
      cache: 'no-store',
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.warn('Falha ingest', speaker, r.status, t);
    }
  }

  function pickMime(): string | '' {
    const cand = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ];
    // @ts-ignore
    if (typeof MediaRecorder === 'undefined') return '';
    // @ts-ignore
    for (const c of cand) if (MediaRecorder.isTypeSupported?.(c)) return c;
    return '';
  }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <h3 className="text-lg font-semibold">Duo Mic (Presencial)</h3>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs opacity-70">Mic do Médico</label>
          <select className="w-full border rounded p-2"
                  value={docId} onChange={e => setDocId(e.target.value)}>
            <option value="">Selecione</option>
            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs opacity-70">Mic do Paciente</label>
          <select className="w-full border rounded p-2"
                  value={patId} onChange={e => setPatId(e.target.value)}>
            <option value="">Selecione</option>
            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="rounded-md border px-3 py-1" onClick={openStreams}>
          Conectar microfones
        </button>
        <button className="rounded-md border px-3 py-1" onClick={start}
                disabled={!docStream || !patStream || recording}>
          🎙️ Iniciar
        </button>
        <button className="rounded-md border px-3 py-1" onClick={stop}
                disabled={!recording}>
          ⏹️ Parar
        </button>
      </div>

      <p className="text-xs opacity-70">
        Dicas: use Chrome/Edge. Em macOS, se houver drift, crie um “Aggregate Device”.
        Posicione lapelas para reduzir vazamento entre canais.
      </p>

      <Consent />
    </div>
  );
}

function Consent() {
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
      Ao iniciar, você confirma que informou o paciente e obteve consentimento para gravação/transcrição.
    </div>
  );
}
5) Usar o componente na página
File (exemplo): src/app/dashboard/nova-consulta/page.tsx

tsx
Copiar
Editar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import DualMicTranscriber from '@/components/telemed/DualMicTranscriber';

export default function NovaConsultaPage({ searchParams }: { searchParams: { consultationId?: string }}) {
  const id = searchParams?.consultationId || '';
  return (
    <main className="p-6 space-y-6">
      <DualMicTranscriber consultationId={id} />
      {/* Aqui você pode renderizar a Anamnese/utterances ao vivo */}
    </main>
  );
}
6) (Opcional) Renderizar a conversa rotulada (timeline simples)
File: src/components/telemed/UtterancesTimeline.tsx

tsx
Copiar
Editar
'use client';
import { useEffect, useState } from 'react';

type Row = {
  id: string;
  speaker: 'doctor'|'patient';
  text: string;
  start_ms: number|null;
  created_at: string;
};

export default function UtterancesTimeline({ consultationId }: { consultationId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const r = await fetch(`/api/telemed/utterances?consultationId=${consultationId}`, { cache: 'no-store' });
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 3000); // polling leve
    return () => clearInterval(t);
  }, [consultationId]);

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <h3 className="text-sm font-semibold">Conversa</h3>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className={`flex ${r.speaker==='patient'?'justify-start':'justify-end'}`}>
            <div className={`max-w-[80%] rounded-lg p-2 text-sm
              ${r.speaker==='patient'?'bg-blue-50 border border-blue-200':'bg-emerald-50 border border-emerald-200'}`}>
              <div className="text-[10px] opacity-60 mb-1">
                {r.speaker === 'patient' ? 'Paciente' : 'Médico'}
              </div>
              <div>{r.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
Rota auxiliar para listar utterances (opcional):
File: src/app/api/telemed/utterances/route.ts

ts
Copiar
Editar
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const consultationId = url.searchParams.get('consultationId') || '';
  if (!consultationId) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabaseAdmin
    .from('utterances')
    .select('id,speaker,text,start_ms,created_at')
    .eq('consultation_id', consultationId)
    .order('start_ms', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? [], { status: 200 });
}
7) Notas finais de qualidade
Timeslice de 3000 ms equilibra latência/erro.

EC/NS/AGC desligados para não distorcer (lapelas próximas à boca ajudam).

Fallback 1 mic: se não houver dois mics, você ainda captura 1 e salva com speaker='patient'.

Integração com Anamnese: quando speaker==='patient', você pode chamar seu endpoint /api/anamnese/ingest com o text retornado para preencher o JSON de Anamnese.

makefile
Copiar
Editar
::contentReference[oaicite:0]{index=0}