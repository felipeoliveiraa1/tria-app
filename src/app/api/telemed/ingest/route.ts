import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { anamneseJsonSchema, emptyState, mergeAnamnese, AnamneseState } from '@/lib/anamnese-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EXTRACT_SYSTEM = `
Você é um extrator clínico especializado em teleconsultas. Dado um trecho de fala (pt-BR) de uma videoconferência médica, atualize um JSON de Anamnese.

REGRAS IMPORTANTES:
- NUNCA invente dados que não estão na transcrição
- Preencha sempre: {value, confidence (0-1), evidence_text, confirmed}
- NÃO altere campos já confirmados=true no estado atual
- Para teleconsultas, seja mais rigoroso com a confiança devido à qualidade de áudio variável
- Considere ruídos de conexão, cortes de áudio e qualidade inferior
- Se não tiver certeza, mantenha confidence baixo (< 0.5)

ESPECIALIDADES DE TELECONSULTA:
- Identifique quando há múltiplas vozes (médico vs paciente)
- Ignore ruídos de notificação, eco ou problemas técnicos
- Foque em informações médicas claras e completas
- Seja conservador com diagnósticos ou informações críticas via áudio remoto
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

    if (!file) {
      return error({ error: 'Arquivo de áudio é obrigatório' }, 400);
    }

    if (!consultationId) {
      return error({ error: 'ID da consulta é obrigatório' }, 400);
    }

    console.log('🎙️ [Telemed] Processando chunk de áudio:', {
      fileName: file.name,
      fileSize: file.size,
      consultationId,
      mimeType: file.type
    });

    // Verificar se o arquivo é muito pequeno (menos de 500 bytes definitivamente não tem áudio útil)
    if (file.size < 500) {
      console.warn('⚠️ [Telemed] Arquivo muito pequeno, provavelmente sem áudio');
      return json({ 
        ok: true, 
        text: '', 
        message: 'Arquivo muito pequeno ou sem conteúdo de áudio' 
      });
    }

    // Log adicional para debug
    console.log('📊 [Telemed] Detalhes do arquivo:', {
      size: file.size,
      type: file.type,
      name: file.name,
      lastModified: (file as any).lastModified,
      stream: !!file.stream
    });

    // Verificar se o arquivo tem extensão válida
    const supportedExtensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      console.warn('⚠️ [Telemed] Extensão não suportada:', fileExtension);
      return json({ 
        ok: true, 
        text: '', 
        message: `Extensão ${fileExtension} não suportada. Use: ${supportedExtensions.join(', ')}` 
      });
    }

    // Verificar se a chave da OpenAI está configurada
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('sua_chave') || apiKey.includes('aqui') || !apiKey.startsWith('sk-')) {
      console.warn('OpenAI API key não configurada, retornando mock...');
      const mockText = `[MOCK ${new Date().toLocaleTimeString()}] Transcrição simulada para teste de telemedicina`;
      return json({ 
        ok: true, 
        text: mockText, 
        state: emptyState(),
        mock: true 
      });
    }

    // 1) Transcrever áudio usando Whisper (WebM Opus/MP4/MP3 suportados)
    let transcript;
    try {
      console.log('🔄 [Telemed] Iniciando transcrição com Whisper...', {
        model: 'whisper-1',
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size
      });
      
      transcript = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'pt',
        response_format: 'json',
        temperature: 0.2, // Mais conservador para teleconsultas
        prompt: 'Esta é uma teleconsulta médica em português brasileiro entre médico e paciente.' // Contexto para melhor transcrição
      });
    } catch (transcriptionError: any) {
      console.error('❌ [Telemed] Erro na transcrição:', transcriptionError);
      
      // Se for erro de formato de arquivo, tentar retornar informação útil
      if (transcriptionError?.message?.includes('Invalid file format')) {
        console.error('❌ [Telemed] Formato de arquivo rejeitado pela OpenAI:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
        
        // Retornar erro específico mas não fatal
        return json({ 
          ok: true, 
          text: '', 
          error: 'Formato de arquivo não aceito pela OpenAI',
          details: `Arquivo: ${file.name} (${file.type}, ${file.size} bytes)`,
          suggestion: 'Tente com uma aba que tenha áudio mais claro ou verifique se o compartilhamento de áudio está ativo'
        });
      }
      
      throw new Error(`Erro na transcrição: ${transcriptionError instanceof Error ? transcriptionError.message : 'Erro desconhecido'}`);
    }

    const text = (transcript as any).text as string;
    console.log('✅ [Telemed] Transcrição concluída:', text.substring(0, 100) + '...');

    if (!text || text.trim().length === 0) {
      console.warn('⚠️ [Telemed] Transcrição vazia, ignorando chunk');
      return json({ ok: true, text: '', message: 'Chunk de áudio vazio ou sem fala detectada' });
    }

    // 2) Carregar estado atual da anamnese
    let current: AnamneseState;
    try {
      const { data, error: qErr } = await supabaseAdmin
        .from('consultations')
        .select('anamnese')
        .eq('id', consultationId)
        .single();
      
      if (qErr && qErr.code !== 'PGRST116') {
        console.error('❌ [Telemed] Erro ao buscar consulta:', qErr);
        throw qErr;
      }
      
      current = (data?.anamnese as AnamneseState) ?? emptyState();
      console.log('📋 [Telemed] Estado atual da anamnese carregado');
    } catch (dbError) {
      console.error('❌ [Telemed] Erro de banco de dados:', dbError);
      throw new Error(`Erro ao carregar anamnese: ${dbError instanceof Error ? dbError.message : 'Erro de banco'}`);
    }

    // 3) Extrair informações usando OpenAI com structured output
    let extracted: AnamneseState;
    try {
      console.log('🧠 [Telemed] Iniciando extração de dados clínicos...');
      
      // Usar chat completions em vez de responses API para maior compatibilidade
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM },
          { role: 'user', content: `Estado atual da anamnese:\n${JSON.stringify(current)}` },
          { role: 'user', content: `Novo trecho transcrito da teleconsulta:\n"""${text}"""` },
          { role: 'user', content: 'Retorne APENAS um JSON válido no formato do schema, sem explicações adicionais.' }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Mais determinístico para dados médicos
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Resposta vazia da OpenAI');
      }

      extracted = JSON.parse(responseText) as AnamneseState;
      console.log('✅ [Telemed] Extração concluída');
    } catch (extractionError) {
      console.error('❌ [Telemed] Erro na extração:', extractionError);
      // Em caso de erro na extração, retornar apenas a transcrição
      return json({ 
        ok: true, 
        text, 
        state: current, 
        error: 'Erro na extração de dados, mas transcrição salva',
        extractionError: extractionError instanceof Error ? extractionError.message : 'Erro desconhecido'
      });
    }

    // 4) Merge das informações e persistência
    try {
      const merged = mergeAnamnese(current, extracted);
      
      const { error: updateError } = await supabaseAdmin
        .from('consultations')
        .update({ 
          anamnese: merged,
          updated_at: new Date().toISOString()
        })
        .eq('id', consultationId);
      
      if (updateError) {
        console.error('❌ [Telemed] Erro ao atualizar consulta:', updateError);
        throw updateError;
      }

      console.log('✅ [Telemed] Anamnese atualizada com sucesso');

      // Calcular diferenças para feedback
      const changes = calculateChanges(current, merged);

      return json({ 
        ok: true, 
        text, 
        state: merged,
        changes: changes.length,
        changedFields: changes
      });

    } catch (persistenceError) {
      console.error('❌ [Telemed] Erro na persistência:', persistenceError);
      throw new Error(`Erro ao salvar: ${persistenceError instanceof Error ? persistenceError.message : 'Erro de banco'}`);
    }

  } catch (e: any) {
    console.error('❌ [Telemed] Erro geral:', e);
    return error({ 
      error: e?.message ?? 'Erro interno do servidor',
      details: e?.stack?.substring(0, 500) // Logs para debug
    }, 500);
  }
}

function json(payload: any, status = 200) {
  const res = NextResponse.json(payload, { status });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

function error(payload: any, status = 400) { 
  return json(payload, status); 
}

// Função para calcular mudanças entre estados
function calculateChanges(previous: AnamneseState, current: AnamneseState): string[] {
  const changes: string[] = [];
  
  for (const sectionKey of Object.keys(current)) {
    const prevSection = (previous as any)[sectionKey] || {};
    const currSection = (current as any)[sectionKey] || {};
    
    for (const fieldKey of Object.keys(currSection)) {
      const prevField = prevSection[fieldKey];
      const currField = currSection[fieldKey];
      
      if (!prevField || 
          prevField.value !== currField.value || 
          (prevField.confidence || 0) < (currField.confidence || 0)) {
        changes.push(`${sectionKey}.${fieldKey}`);
      }
    }
  }
  
  return changes;
}

// Handle OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
