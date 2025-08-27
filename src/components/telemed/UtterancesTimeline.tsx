'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Stethoscope } from 'lucide-react';

type Utterance = {
  id: string;
  speaker: 'doctor' | 'patient';
  text: string;
  start_ms: number | null;
  end_ms: number | null;
  confidence: number | null;
  created_at: string;
};

type Props = {
  consultationId: string;
};

export default function UtterancesTimeline({ consultationId }: Props) {
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  async function loadUtterances() {
    if (!consultationId) return;

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(
        `/api/telemed/utterances?consultationId=${encodeURIComponent(consultationId)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setUtterances(data);
      console.log('📋 Utterances carregadas:', data.length);

    } catch (err) {
      console.error('❌ Erro ao carregar utterances:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUtterances();
    
    // Polling para atualizações em tempo real
    const interval = setInterval(loadUtterances, 3000);
    
    return () => clearInterval(interval);
  }, [consultationId]);

  function formatTimestamp(ms: number | null): string {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function formatRelativeTime(createdAt: string): string {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return 'agora';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m atrás`;
    return `${Math.floor(diffSeconds / 3600)}h atrás`;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Timeline da Conversa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Timeline da Conversa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <p>Erro ao carregar conversas: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Timeline da Conversa</span>
          <Badge variant="secondary">{utterances.length}</Badge>
        </CardTitle>
        <CardDescription>
          Falas transcritas e rotuladas por speaker em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        {utterances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma fala transcrita ainda.</p>
            <p className="text-sm">As transcrições aparecerão aqui conforme a gravação progride.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {utterances.map((utterance, index) => (
              <div
                key={utterance.id}
                className={`flex ${
                  utterance.speaker === 'patient' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm ${
                    utterance.speaker === 'patient'
                      ? 'bg-blue-50 border border-blue-200 text-blue-900'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  }`}
                >
                  {/* Header da fala */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {utterance.speaker === 'patient' ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Stethoscope className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {utterance.speaker === 'patient' ? 'Paciente' : 'Médico'}
                      </span>
                      {utterance.start_ms && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {formatTimestamp(utterance.start_ms)}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs opacity-60">
                      {formatRelativeTime(utterance.created_at)}
                    </span>
                  </div>

                  {/* Texto da fala */}
                  <div className="leading-relaxed">
                    {utterance.text}
                  </div>

                  {/* Footer com confiança se disponível */}
                  {utterance.confidence && (
                    <div className="mt-2 pt-2 border-t border-current opacity-30">
                      <span className="text-xs">
                        Confiança: {Math.round(utterance.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {utterances.length > 0 && (
          <div className="mt-4 pt-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Total de {utterances.length} falas • Atualização automática a cada 3s
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

