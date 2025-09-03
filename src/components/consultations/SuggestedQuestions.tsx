'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, RefreshCw, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Suggestion = {
  id: string;
  text: string;
  category: string;
  priority: number; // 1=alta
  rationale: string;
  targets: string[];
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
      console.error('Erro ao buscar sugestões:', e);
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
    try { 
      navigator.clipboard.writeText(text); 
      // Aqui você pode adicionar um toast de confirmação se quiser
    } catch (e) {
      console.error('Erro ao copiar texto:', e);
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Urgente';
      case 2: return 'Alta';
      case 3: return 'Média';
      case 4: return 'Baixa';
      case 5: return 'Opcional';
      default: return `P${priority}`;
    }
  };

  return (
    <Card className="h-fit max-h-[calc(100vh-2rem)] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Sugestões de Perguntas (IA)
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchSuggestions} 
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Gerando...' : 'Regenerar'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
        {error && (
          <div className="text-sm text-red-600 border border-red-200 rounded-lg p-3 bg-red-50">
            {error}
          </div>
        )}

        {suggestions.length === 0 && !loading && !error && (
          <div className="text-sm text-gray-500 text-center py-8">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            Sem sugestões no momento.
            <br />
            <span className="text-xs">Aguardando mais contexto da conversa...</span>
          </div>
        )}

        {loading && suggestions.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-8">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-spin" />
            Gerando sugestões...
          </div>
        )}

        <div className="space-y-3">
          {suggestions
            .sort((a, b) => a.priority - b.priority)
            .map((s) => (
            <div key={s.id} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getPriorityColor(s.priority)}`}>
                    {getPriorityLabel(s.priority)}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {s.category}
                  </span>
                </div>
                {s.targets.length > 0 && (
                  <span className="text-xs text-gray-500">{s.targets.join(', ')}</span>
                )}
              </div>
              
              <div className="text-sm text-gray-900 mb-3 leading-relaxed">
                {s.text}
              </div>
              
              {s.rationale && s.rationale.trim() && (
                <div className="text-xs text-gray-600 mb-3 italic border-l-2 border-gray-200 pl-2">
                  {s.rationale}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => { 
                    onAsk?.(s.text); 
                    copy(s.text); 
                  }}
                  className="h-8 text-xs"
                  title="Usar esta pergunta"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Perguntar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(s.text)}
                  className="h-8 text-xs"
                  title="Copiar pergunta"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {suggestions.length > 0 && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Atualiza automaticamente a cada {Math.round((autoRefreshMs || 0)/1000)}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}
