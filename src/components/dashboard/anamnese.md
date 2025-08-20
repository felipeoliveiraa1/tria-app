# 🎯 Prompt — Implementar Anamnese guiada com transcrição em tempo real (sidebar fixa)

> Objetivo: criar um fluxo de **Anamnese** com as perguntas **fixas na lateral (sticky)**, transcrição em tempo real (Web Speech API) e **autosave opcional** na consulta.  
> Stack-alvo: Next.js (App Router) + TS + Tailwind/shadcn.  
> **Não dependa de hooks existentes** — o componente deve ser **autossuficiente** (usa Web Speech API direto).

---

## 1) Criar o catálogo de perguntas (com seções)  
**File:** `src/components/consultations/anamnese-questions.ts`
```ts
export type AnamneseItem = { id: string; label: string };
export type AnamneseSection = { id: string; title: string; items: AnamneseItem[] };

export const ANAMNESE_SECTIONS: AnamneseSection[] = [
  {
    id: 'identificacao',
    title: 'Identificação',
    items: [
      { id: 'nome_completo', label: 'Qual seu nome completo?' },
      { id: 'idade', label: 'Idade?' },
      { id: 'sexo', label: 'Sexo?' },
      { id: 'cor_raca', label: 'Cor/raça?' },
      { id: 'nacionalidade_naturalidade', label: 'Nacionalidade e naturalidade?' },
      { id: 'estado_civil', label: 'Estado civil?' },
      { id: 'profissao', label: 'Profissão?' },
      { id: 'onde_mora', label: 'Onde mora atualmente?' },
      { id: 'procedencia', label: 'De onde veio (procedência)?' },
    ],
  },
  {
    id: 'qp',
    title: 'Queixa Principal (QP)',
    items: [
      { id: 'qp_queixa', label: 'Qual é sua principal queixa hoje?' },
      { id: 'qp_tempo', label: 'Há quanto tempo está sentindo isso?' },
    ],
  },
  {
    id: 'hma',
    title: 'História da Moléstia Atual (HMA)',
    items: [
      { id: 'hma_inicio', label: 'Quando começaram os sintomas?' },
      { id: 'hma_instalacao', label: 'Como eles começaram (súbito ou gradual)?' },
      { id: 'hma_localizacao', label: 'Onde sente (localização, irradiação, profundidade)?' },
      { id: 'hma_qualidade', label: 'Como é a dor/sintoma (tipo, qualidade)?' },
      { id: 'hma_freq_intensidade', label: 'Com que frequência e intensidade ocorre?' },
      { id: 'hma_fatores', label: 'O que piora ou melhora?' },
      { id: 'hma_desencadeia', label: 'Existe algo que desencadeia?' },
      { id: 'hma_associados', label: 'Tem outros sintomas associados?' },
      { id: 'hma_previos', label: 'Já fez exames ou tratamentos anteriores? Quais?' },
    ],
  },
  {
    id: 'ap',
    title: 'Antecedentes Pessoais (AP)',
    items: [
      { id: 'ap_nascimento_desenvolvimento', label: 'Como foi seu nascimento e desenvolvimento?' },
      { id: 'ap_doencas_importantes', label: 'Teve doenças importantes? Quais?' },
      { id: 'ap_cirurgias_hosp_exames', label: 'Já fez cirurgias, hospitalizações, exames relevantes?' },
      { id: 'ap_acidentes', label: 'Sofreu acidentes/traumatismos?' },
      { id: 'ap_alergias', label: 'Tem alergias?' },
      { id: 'ap_mulher_gineco', label: 'Se mulher: menarca, ciclo, anticoncepcionais, gestações/partos/abortos.' },
      { id: 'ap_contexto', label: 'Como é seu trabalho, moradia, alimentação, condições sanitárias?' },
      { id: 'ap_habitos', label: 'Tem hábitos de fumo, álcool, drogas?' },
      { id: 'ap_sono_humor', label: 'Como é seu sono e humor?' },
      { id: 'ap_medicamentos', label: 'Usa medicamentos? Quais e em que dose?' },
    ],
  },
  {
    id: 'af',
    title: 'Antecedentes Familiares (AF)',
    items: [
      { id: 'af_saude_familia', label: 'Como está a saúde dos pais, irmãos, cônjuge, filhos, avós?' },
      { id: 'af_semelhantes', label: 'Alguém na família teve doenças semelhantes?' },
      { id: 'af_hist_repeticao', label: 'Há histórico familiar (coração, diabetes, câncer etc.)?' },
      { id: 'af_obitos', label: 'Causas de falecimento de familiares?' },
    ],
  },
  {
    id: 'ida',
    title: 'Interrogatório Sintomatológico (IDA)',
    items: [
      { id: 'ida_cabeca', label: 'Cabeça: dor de cabeça, tontura?' },
      { id: 'ida_olhos', label: 'Olhos: visão embaçada, dor, perda de visão?' },
      { id: 'ida_ouvidos', label: 'Ouvidos: dor, secreção, zumbido, perda de audição?' },
      { id: 'ida_nariz', label: 'Nariz: obstrução, sangramento, secreção?' },
      { id: 'ida_boca_garganta', label: 'Boca/Garganta: dor, disfagia, rouquidão, problemas dentários?' },
      { id: 'ida_cardio_pulmonar', label: 'Coração/Pulmão: dor torácica, palpitações, dispneia, tosse?' },
      { id: 'ida_digestivo', label: 'Digestivo: apetite, náusea, vômito, dor abdominal, fezes?' },
      { id: 'ida_urinario_genital', label: 'Urinário/Genital: disúria, frequência, hematúria, corrimento, potência sexual?' },
      { id: 'ida_neurologico', label: 'Sistema nervoso: convulsão, tremores, fraqueza, dormência?' },
      { id: 'ida_musculoesqueletico', label: 'Ossos/articulações/músculos: dores, fraqueza, rigidez?' },
      { id: 'ida_endocrino', label: 'Endócrino: peso, intolerância térmica, crescimento anormal?' },
      { id: 'ida_linfatico', label: 'Linfático: gânglios, sangramentos, hematomas frequentes?' },
    ],
  },
];
2) Criar o componente com sidebar fixa + STT + autosave
File: src/components/consultations/AnamneseRunner.tsx

tsx
Copiar
Editar
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ANAMNESE_SECTIONS, AnamneseItem } from './anamnese-questions';

type Props = {
  consultationId?: string;         // se informado, faz autosave na API
  initialAnswers?: Record<string, string>; // opcional para editar respostas prévias
};

type STTState = {
  supported: boolean;
  listening: boolean;
  interim: string;
  finalText: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

// Hook STT (Web Speech API) autônomo
function useSpeechToText(): STTState {
  const Recognition = (typeof window !== 'undefined')
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : undefined;

  const recRef = useRef<any>(null);
  const [supported] = useState<boolean>(!!Recognition);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [finalText, setFinalText] = useState('');

  useEffect(() => {
    if (!supported) return;
    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'pt-BR';

    rec.onresult = (e: any) => {
      let interimS = '';
      let finalS = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalS += t + ' ';
        else interimS += t + ' ';
      }
      if (interimS) setInterim(interimS.trim());
      if (finalS) {
        setFinalText(finalS.trim());
        setInterim('');
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} recRef.current = null; };
  }, [supported]);

  return {
    supported,
    listening,
    interim,
    finalText,
    start: () => { try { recRef.current?.start(); setListening(true); } catch {} },
    stop: () => { try { recRef.current?.stop(); setListening(false); } catch {} },
    reset: () => { setInterim(''); setFinalText(''); },
  };
}

// persistência simples no storage (com try/catch)
const safeGet = <T,>(k: string): T | null => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
};
const safeSet = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function AnamneseRunner({ consultationId, initialAnswers }: Props) {
  const ALL: AnamneseItem[] = ANAMNESE_SECTIONS.flatMap(s => s.items);
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialAnswers ?? safeGet<Record<string, string>>('tria:anamnese:draft') ?? {}
  );
  const [currentId, setCurrentId] = useState<string>(ALL[0]?.id ?? '');
  const current = useMemo(() => ALL.find(i => i.id === currentId), [ALL, currentId]);

  const stt = useSpeechToText();

  // salvar rascunho local
  useEffect(() => { safeSet('tria:anamnese:draft', answers); }, [answers]);

  // autosave remoto (consulta) — opcional
  const saveRemote = useMemo(() => {
    if (!consultationId) return null;
    return async (data: Record<string, string>) => {
      await fetch('/api/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: consultationId, anamnese: data }),
      });
    };
  }, [consultationId]);

  // ao chegar um bloco final do STT, confirmar resposta e avançar
  useEffect(() => {
    if (!stt.finalText || !current) return;
    const next = { ...answers, [current.id]: stt.finalText };
    setAnswers(next);
    if (saveRemote) saveRemote(next).catch(() => {});
    stt.reset();

    // avançar para a próxima pergunta
    const idx = ALL.findIndex(i => i.id === current.id);
    const nextItem = ALL[idx + 1] ?? ALL[idx];
    setCurrentId(nextItem.id);
  }, [stt.finalText]); // eslint-disable-line react-hooks/exhaustive-deps

  // UI helpers
  const isAnswered = (id: string) => Boolean(answers[id]?.trim());
  const currentValue = answers[current?.id ?? ''] ?? stt.interim ?? '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
      {/* Sidebar fixa */}
      <aside className="md:sticky md:top-0 h-fit md:h-[calc(100vh-1rem)] overflow-auto rounded-xl border p-4">
        <h3 className="text-lg font-semibold mb-3">📋 Perguntas da Anamnese</h3>
        <nav className="space-y-4">
          {ANAMNESE_SECTIONS.map(sec => (
            <div key={sec.id} className="space-y-2">
              <div className="text-sm font-medium opacity-70">{sec.title}</div>
              <ul className="space-y-1">
                {sec.items.map(it => {
                  const active = it.id === currentId;
                  return (
                    <li key={it.id}>
                      <button
                        className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-muted/60 transition ${
                          active ? 'bg-muted font-medium' : ''
                        }`}
                        onClick={() => setCurrentId(it.id)}
                        title={it.label}
                      >
                        <span className={`inline-block w-4 h-4 mr-2 rounded-full align-middle ${
                          isAnswered(it.id) ? 'bg-green-500/80' : 'bg-zinc-500/40'
                        }`} />
                        {it.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Área principal */}
      <section className="space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs opacity-60">
              {ALL.findIndex(i => i.id === currentId) + 1} de {ALL.length}
            </div>
            <h2 className="text-xl font-semibold">{current?.label}</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded border ${stt.listening ? 'bg-green-500/10 border-green-500/40' : 'opacity-60'}`}>
              {stt.listening ? 'Gravando…' : (stt.supported ? 'Pronto p/ gravar' : 'STT indisponível')}
            </span>
            {stt.supported && !stt.listening && (
              <button className="rounded-md border px-3 py-1" onClick={stt.start}>🎙️ Iniciar</button>
            )}
            {stt.supported && stt.listening && (
              <button className="rounded-md border px-3 py-1" onClick={stt.stop}>⏹️ Parar</button>
            )}
          </div>
        </header>

        {/* Campo de resposta ao vivo + edição manual */}
        <div className="rounded-xl border p-4">
          <label className="text-xs uppercase opacity-60">Resposta</label>
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-md border p-3 bg-transparent"
            value={currentValue}
            onChange={(e) => {
              const txt = e.target.value;
              // edição manual não interfere na detecção de final — salva ao confirmar
              // guardamos como "interim" visual
            }}
            placeholder="Fale para transcrever ou digite a resposta…"
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              className="rounded-md border px-3 py-1"
              onClick={() => {
                // limpar resposta da pergunta atual
                setAnswers(prev => {
                  const cpy = { ...prev }; delete cpy[currentId]; return cpy;
                });
                if (saveRemote) saveRemote({ ...answers, [currentId]: '' }).catch(() => {});
              }}
            >Limpar</button>
            <button
              className="rounded-md border px-3 py-1"
              onClick={() => {
                // confirmar manualmente o conteúdo do textarea (interim)
                const el = document.querySelector('textarea') as HTMLTextAreaElement | null;
                const val = (el?.value ?? '').trim();
                if (!val) return;
                const next = { ...answers, [currentId]: val };
                setAnswers(next);
                if (saveRemote) saveRemote(next).catch(() => {});
                // ir para próxima
                const idx = ALL.findIndex(i => i.id === currentId);
                const nextItem = ALL[idx + 1] ?? ALL[idx];
                setCurrentId(nextItem.id);
              }}
            >Confirmar</button>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-medium mb-2">Respostas (rascunho)</h3>
          <div className="text-xs whitespace-pre-wrap break-words">
            {Object.keys(answers).length === 0 ? '—' : JSON.stringify(answers, null, 2)}
          </div>
        </div>
      </section>
    </div>
  );
}
3) Usar o componente numa página existente (ex.: Nova Consulta)
Se você tem a rota src/app/dashboard/nova-consulta/page.tsx, importe o componente e passe o consultationId que estiver em contexto.
Se não tiver o ID ainda, chame sem consultationId (ele salva só localmente).

Exemplo mínimo src/app/dashboard/nova-consulta/page.tsx

tsx
Copiar
Editar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AnamneseRunner from '@/components/consultations/AnamneseRunner';

export default function NovaConsultaPage({ searchParams }: { searchParams: { consultationId?: string } }) {
  const consultationId = searchParams?.consultationId; // ajuste conforme seu fluxo
  return (
    <main className="p-6">
      <AnamneseRunner consultationId={consultationId} />
    </main>
  );
}
4) (Opcional, mas recomendado) Permitir salvar anamnese no backend
DB (migração):

sql
Copiar
Editar
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS anamnese JSONB;
Tipos: em src/types/database.ts, inclua anamnese?: Json no tipo da tabela consultations.

API PUT: em src/app/api/consultations/route.ts, aceite o campo anamnese no body e faça o update correspondente. Garanta cabeçalho Cache-Control: no-store.

Exemplo de trecho no handler PUT

ts
Copiar
Editar
// ...
const body = await req.json();
const { id, anamnese, ...rest } = body;

const update: any = { ...rest };
if (typeof anamnese !== 'undefined') update.anamnese = anamnese;

const { data, error } = await supabase
  .from('consultations')
  .update(update)
  .eq('id', id)
  .select()
  .single();

if (error) return NextResponse.json({ error: error.message }, { status: 400 });

const res = NextResponse.json({ data }, { status: 200 });
res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
return res;
5) Aceitação rápida
Sidebar fixa (sticky) na esquerda, com seções e bolinha verde ao lado das perguntas respondidas.

Transcrição ao vivo (interim) aparece no textarea; quando o STT emite resultado final, a resposta é salva e a UI avança.

Botões Iniciar/Parar gravação; Confirmar permite salvar o que estiver no textarea manualmente.

Se consultationId for fornecido, autosave via PUT /api/consultations é disparado a cada confirmação.

Recarregar a página mantém rascunho no localStorage (chave tria:anamnese:draft).

Observação: a Web Speech API funciona melhor em Chrome/Edge. Em Safari ou dispositivos sem suporte, o estado mostra “STT indisponível” e o fluxo segue por digitação.