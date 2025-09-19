'use client';

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

import DualMicLiveKitTranscriber from './DualMicLiveKitTranscriber';
import WebSpeechTranscriber from './WebSpeechTranscriber';



type Props = {
  consultationId: string;
};

export default function TranscriberSelector({ consultationId }: Props) {
  const [selectedTranscriber, setSelectedTranscriber] = useState<'livekit' | 'webspeech'>('webspeech')

  return (
    <div className="space-y-6">
      {/* Seletor de Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Sistema de Transcrição</span>
          </CardTitle>
          <CardDescription>
            Escolha entre LiveKit (dual mic) ou Web Speech API (nativo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              variant={selectedTranscriber === 'webspeech' ? 'default' : 'outline'}
              onClick={() => setSelectedTranscriber('webspeech')}
            >
              🎤 Web Speech API
            </Button>
            <Button
              variant={selectedTranscriber === 'livekit' ? 'default' : 'outline'}
              onClick={() => setSelectedTranscriber('livekit')}
            >
              🔗 LiveKit Dual Mic
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sistema Selecionado */}
      {selectedTranscriber === 'webspeech' ? (
        <WebSpeechTranscriber consultationId={consultationId} />
      ) : (
        <DualMicLiveKitTranscriber consultationId={consultationId} />
      )}
    </div>
  );
}

