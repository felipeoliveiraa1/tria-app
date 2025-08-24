import { AnamneseState } from './anamnese-schema';

type AnamneseIngestResponse = {
  state: AnamneseState;
  deltas: Array<{ path: string; from: any; to: any }>;
  error?: string;
};

/**
 * Envia um trecho de transcrição para a API de anamnese com IA
 */
export async function pushChunk(
  consultationId: string, 
  transcriptChunk: string, 
  snapshotState?: AnamneseState
): Promise<AnamneseIngestResponse> {
  const response = await fetch('/api/anamnese/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ 
      consultationId, 
      transcriptChunk, 
      state: snapshotState 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Ingest falhou: ${response.status} - ${errorData.error || 'Erro desconhecido'}`);
  }

  return response.json();
}

/**
 * Utilitário para determinar a cor do campo baseado na confiança
 */
export function getConfidenceColor(confidence: number, confirmed: boolean): string {
  if (confirmed) return 'text-green-800 bg-green-100 border-green-300';
  if (confidence < 0.4) return 'text-gray-500 bg-gray-50 border-gray-200';
  if (confidence < 0.7) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-green-700 bg-green-50 border-green-200';
}

/**
 * Utilitário para obter ícone baseado na confiança
 */
export function getConfidenceIcon(confidence: number, confirmed: boolean): string {
  if (confirmed) return '✓';
  if (confidence < 0.4) return '?';
  if (confidence < 0.7) return '!';
  return '✓';
}

