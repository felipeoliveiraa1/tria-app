import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { anamneseJsonSchema, emptyState, mergeAnamnese, AnamneseState } from '@/lib/anamnese-schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM_PROMPT = `
Você é um extrator clínico. Recebe trechos de fala (pt-BR) e atualiza um JSON de Anamnese.
NUNCA invente dados. Se não houver evidência, mantenha value=null e confidence=0.
Para cada campo, preencha: value, confidence (0–1), evidence_text (trecho literal), confirmed (bool).
Nunca altere um campo que já esteja confirmado=true no estado atual (avise definindo o mesmo valor).
Regras:
- "idade": se explícita em anos, value = número. Se disser meses, deixe value=null e capture o texto em evidence_text.
- "sexo": normalizar para "masculino" | "feminino" | "outro" | "não informado" (string).
- Datas/tempos: se incertos, mantenha em texto em evidence_text; value pode ser string simples.
- Sintomas: pode ser string com lista natural; não crie códigos.`;

type Body = {
  consultationId?: string;
  transcriptChunk: string;
  language?: string; // default: pt-BR
  state?: AnamneseState; // opcional: cliente pode enviar snapshot atual para reduzir I/O
};

export async function POST(req: Request) {
  try {
    const { consultationId, transcriptChunk, language = 'pt-BR', state } = await req.json() as Body;

    if (!transcriptChunk || typeof transcriptChunk !== 'string') {
      return json({ error: 'transcriptChunk obrigatório' }, 400);
    }

    // 1) Carregar estado atual
    let current: AnamneseState;
    if (state) {
      current = state;
    } else if (consultationId) {
      const { data, error } = await supabaseAdmin
        .from('consultations')
        .select('anamnese')
        .eq('id', consultationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      current = (data?.anamnese as AnamneseState) ?? emptyState();
    } else {
      current = emptyState();
    }

    let extracted: AnamneseState;
    let usedMock = false;

    // 2) Verificar se a chave da OpenAI está configurada
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('Chave OpenAI encontrada:', apiKey ? `${apiKey.substring(0, 20)}...` : 'Não encontrada');
    if (!apiKey || apiKey.includes('sua_chave') || apiKey.includes('aqui') || !apiKey.startsWith('sk-')) {
      console.warn('OpenAI API key não configurada, usando extração com regex...');
      extracted = extractWithRegex(transcriptChunk, current);
      usedMock = true;
    } else {
      try {
        // Chamar OpenAI (sem structured output para compatibilidade)
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini-2024-07-18',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n\nRetorne APENAS um JSON válido, sem explicações.' },
            {
              role: 'user',
              content:
                `Idioma: ${language}\n` +
                `JSON atual:\n${JSON.stringify(current)}\n\n` +
                `Nova fala transcrita (bloco): """${transcriptChunk}"""\n\n` +
                `Tarefa: Atualize apenas campos com nova evidência. Retorne o JSON COMPLETO no formato do schema.`
            },
          ],
          response_format: { type: 'json_object' },
        });

        const text = response.choices[0]?.message?.content;
        if (!text) {
          throw new Error('Falha ao obter resposta do modelo');
        }

        try {
          extracted = JSON.parse(text);
        } catch (e) {
          throw new Error('Falha ao parsear JSON do modelo');
        }
      } catch (e) {
        console.warn('Erro na OpenAI, usando extração com regex...', e);
        extracted = extractWithRegex(transcriptChunk, current);
        usedMock = true;
      }
    }

    // 3) Merge (não sobrescrever confirmed)
    const merged = mergeAnamnese(current, extracted);

    // 4) Persistir (se houver consultationId)
    if (consultationId) {
      const { error: upErr } = await supabaseAdmin
        .from('consultations')
        .update({ anamnese: merged })
        .eq('id', consultationId);
      if (upErr) throw upErr;
    }

    // 5) Sinalizar quais campos mudaram (delta simples, opcional)
    const deltas = diffChanges(current, merged);

    return json({ 
      state: merged, 
      deltas, 
      mock: usedMock,
      message: usedMock ? 'Usando extração com regex (OpenAI não disponível)' : 'Usando OpenAI'
    });
  } catch (e: any) {
    console.error('Erro na rota de anamnese:', e);
    return json({ error: e?.message ?? 'Erro interno' }, 500);
  }
}

function json(payload: any, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}

// Extração com regex como fallback (quando OpenAI não está disponível)
function extractWithRegex(text: string, current: AnamneseState): AnamneseState {
  const result = structuredClone(current);
  const lowerText = text.toLowerCase();

  // Padrões de regex para identificação
  const patterns = {
    // Identificação
    nome: /(?:meu nome é|me chamo)\s+([a-záàâãéèêíïóôõöúçñ\s]{2,50})(?=\s*,|\s*e|\s*tenho|\s*sou|\s*$)/i,
    idade: /(?:tenho|idade de|com)\s+(\d{1,3})\s*anos/i,
    sexo: /(?:sou|sexo)\s+(masculino|feminino|homem|mulher|macho|fêmea)/i,
    
    // Queixa Principal
    queixa: /(?:queixa|problema|dor|sinto|tenho)\s+(?:é|principal|de)?\s*([a-záàâãéèêíïóôõöúçñ\s,.-]{5,50})/i,
    tempo: /(?:há|faz|desde)\s+(\d+\s*(?:dias?|semanas?|meses?|anos?))/i,
    
    // Localização
    localizacao: /(?:dor|problema|sinto)\s+(?:no|na|em|do|da)\s+([a-záàâãéèêíïóôõöúçñ\s]{3,30})/i,
    
    // Medicamentos
    medicamentos: /(?:tomo|uso|remédio|medicamento)\s+([a-záàâãéèêíïóôõöúçñ\s,.-]{3,50})/i,
    
    // Moradia
    mora: /(?:moro|vivo|resido)\s+(?:em|no|na)\s+([a-záàâãéèêíïóôõöúçñ\s]{3,30})/i,
  };

  // Aplicar padrões
  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      const confidence = 0.6; // Confiança moderada para regex
      const evidence_text = match[0];

      // Mapear para seções corretas
      if (key === 'nome') {
        result.identificacao.nome_completo = {
          value,
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'idade') {
        result.identificacao.idade = {
          value: parseInt(value),
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'sexo') {
        const normalizedSex = value.includes('masc') || value.includes('homem') ? 'masculino' : 
                             value.includes('fem') || value.includes('mulher') ? 'feminino' : value;
        result.identificacao.sexo = {
          value: normalizedSex,
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'queixa') {
        result.qp.queixa = {
          value,
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'tempo') {
        result.qp.tempo = {
          value,
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'localizacao') {
        result.hma.localizacao = {
          value,
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'medicamentos') {
        result.ap.medicamentos = {
          value,
          confidence,
          evidence_text,
          confirmed: false
        };
      } else if (key === 'mora') {
        result.identificacao.onde_mora = {
          value,
          confidence,
          evidence_text,
          confirmed: false
        };
      }
    }
  });

  return result;
}

// Delta ingênuo (compara value/confidence)
function diffChanges(prev: AnamneseState, next: AnamneseState) {
  const changes: Array<{ path: string; from: any; to: any }> = [];
  for (const sec of Object.keys(next)) {
    for (const k of Object.keys((next as any)[sec])) {
      const a = (prev as any)?.[sec]?.[k];
      const b = (next as any)?.[sec]?.[k];
      if (!a || !b) continue;
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        changes.push({ path: `${sec}.${k}`, from: a, to: b });
      }
    }
  }
  return changes;
}
