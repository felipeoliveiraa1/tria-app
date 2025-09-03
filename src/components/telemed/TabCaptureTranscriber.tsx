'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Mic, Square, Monitor, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDualLivekitSTT } from '@/components/recording/hooks/use-dual-livekit-stt';
import { useRecordingStore } from '@/components/recording/store/recording-store';

type Props = { 
  consultationId: string;
  onTranscriptionUpdate?: (text: string) => void;
};

export default function TabCaptureTranscriber({ consultationId, onTranscriptionUpdate }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [allTranscriptions, setAllTranscriptions] = useState<string[]>([]);
  const [totalSegments, setTotalSegments] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  
  const { toast } = useToast();
  
  // Usar o sistema Dual LiveKit para transcrição
  const dualLiveKit = useDualLivekitSTT({
    consultationId
  });
  const { 
    finalSegments, 
    realtimeConnected,
    realtimeReconnecting,
    setConsultationId,
    addFinalSegment 
  } = useRecordingStore();
  
  // Registrar consultationId no store
  useEffect(() => {
    setConsultationId(consultationId);
  }, [consultationId, setConsultationId]);

  async function pickTab() {
    try {
      setConnectionStatus('connecting');
      
      // Verificar se o navegador suporta getDisplayMedia
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Seu navegador não suporta captura de tela. Use Chrome, Edge ou Firefox.');
      }

      // IMPORTANTE: no Chrome/Edge o usuário deve marcar "Compartilhar áudio" da aba
      const s = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: 1, height: 1 }, // Vídeo mínimo necessário para funcionar
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Alta qualidade de áudio
          channelCount: 1     // Mono para economia
        }
      });

      // Verificar se há áudio
      const audioTracks = s.getAudioTracks();
      if (audioTracks.length === 0) {
        // Parar o vídeo se não há áudio
        s.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
        throw new Error('Nenhum áudio foi capturado. Certifique-se de marcar "Compartilhar áudio" ao selecionar a aba.');
      }

      // Criar um novo stream apenas com áudio
      const audioOnlyStream = new MediaStream(audioTracks);
      
      // Desligar o vídeo para economizar CPU (só precisamos de áudio)
      s.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
      
      setStream(audioOnlyStream);
      
      console.log('🎵 Stream de áudio criado:', {
        audioTracks: audioTracks.length,
        firstTrackSettings: audioTracks[0]?.getSettings()
      });
      setConnectionStatus('connected');
      
      toast({
        title: "Aba capturada!",
        description: "Áudio da aba selecionada com sucesso. Agora você pode iniciar a gravação.",
      });

    } catch (e) {
      console.error('Erro ao capturar aba:', e);
      setConnectionStatus('error');
      
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao capturar aba",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }

  function start() {
    if (!stream) {
      toast({
        title: "Selecione uma aba primeiro",
        description: "Você precisa selecionar uma aba antes de iniciar a gravação.",
        variant: "destructive"
      });
      return;
    }
    
    if (recording) return;
    
    if (!dualLiveKit.isSupported()) {
      toast({
        title: "Dual LiveKit não suportado",
        description: "Seu navegador não suporta WebRTC.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('🎬 Iniciando transcrição em tempo real com Dual LiveKit');
    
    // Conectar ao Dual LiveKit
    dualLiveKit.connect();
    setRecording(true);

    // Se o usuário parar o compartilhamento da aba, paramos também
    stream.getAudioTracks().forEach((track: MediaStreamTrack) => {
      track.onended = () => {
        console.log('🔌 Compartilhamento de aba encerrado');
        stop();
        toast({
          title: "Compartilhamento encerrado",
          description: "O compartilhamento da aba foi interrompido.",
          variant: "destructive"
        });
      };
    });

    toast({
      title: "Transcrição iniciada!",
      description: "LiveKit ativado para transcrição em tempo real.",
    });
  }

  function stop() {
    dualLiveKit.disconnect();
    setRecording(false);
    
    toast({
      title: "Transcrição parada",
      description: "O Dual LiveKit foi desconectado.",
    });
  }

  // Monitorar segmentos finais do LiveKit
  useEffect(() => {
    if (finalSegments.length > totalSegments) {
      const newSegments = finalSegments.slice(totalSegments);
      console.log('📝 [Telemedicina] Novos segmentos recebidos:', newSegments.length);
      
      newSegments.forEach(segment => {
        const transcriptionText = segment.text;
        setAllTranscriptions(prev => [...prev, transcriptionText]);
        onTranscriptionUpdate?.(transcriptionText);
        
        console.log('📝 [Telemedicina] Nova transcrição (LiveKit):', transcriptionText);
        
        toast({
          title: "Transcrição recebida",
          description: `"${transcriptionText.substring(0, 50)}${transcriptionText.length > 50 ? '...' : ''}"`,
        });
      });
      
      setTotalSegments(finalSegments.length);
      setLastError(''); // Limpar erro se houver transcrições
    }
  }, [finalSegments, totalSegments, onTranscriptionUpdate, toast]);

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (recording) {
        dualLiveKit.disconnect();
      }
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [recording, stream, dualLiveKit]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (dualLiveKit.isConnecting) return 'Conectando ao Dual LiveKit...';
    if (recording && dualLiveKit.isConnected) return 'Transcrevendo em tempo real';
    if (recording && !dualLiveKit.isConnected) return 'Aguardando conexão do Dual LiveKit...';
    if (stream) return 'Aba conectada - Pronto para transcrever';
    return 'Nenhuma aba selecionada';
  };

  const getStatusColor = () => {
    if (dualLiveKit.isConnecting) return 'text-amber-600';
    if (recording && dualLiveKit.isConnected) return 'text-green-600';
    if (recording && !dualLiveKit.isConnected) return 'text-orange-600';
    if (stream) return 'text-blue-600';
    if (connectionStatus === 'error') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="h-5 w-5" />
          <span>Teleconsulta - Captura de Aba</span>
          {recording && (
            <Badge variant="default" className="bg-red-500 text-white animate-pulse">
              ● Gravando
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Selecione a aba da videoconferência e marque <strong>Compartilhar áudio</strong>.
          <br />
          Recomendado: Chrome ou Edge para melhor compatibilidade.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status da conexão */}
        <div className="flex items-center space-x-3 p-3 bg-background rounded-lg border">
          {getStatusIcon()}
          <div className="flex-1">
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {totalSegments > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalSegments} segmentos transcritos • Dual LiveKit
                {dualLiveKit.isConnecting && ' • Conectando...'}
              </p>
            )}
            {lastError && (
              <p className="text-xs text-red-600 mt-1">
                Último erro: {lastError}
              </p>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={pickTab}
            disabled={recording}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Monitor className="h-4 w-4" />
            <span>Escolher aba</span>
          </Button>
          
          <Button
            onClick={start}
            disabled={!stream || recording || !dualLiveKit.isSupported()}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Mic className="h-4 w-4" />
            <span>Iniciar transcrição</span>
          </Button>
          
          <Button
            onClick={stop}
            disabled={!recording}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <Square className="h-4 w-4" />
            <span>Parar</span>
          </Button>
        </div>

        {/* Transcrições */}
        {allTranscriptions.length > 0 && (
          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Transcrições ({allTranscriptions.length}):</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAllTranscriptions([]);
                  setTotalSegments(0);
                }}
                className="text-xs h-6"
              >
                Limpar
              </Button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {allTranscriptions.slice(-3).map((transcription, index) => (
                <p key={index} className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  "{transcription}"
                </p>
              ))}
              {allTranscriptions.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  ... e mais {allTranscriptions.length - 3} transcrições
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aviso de consentimento */}
        <ConsentNote />

        {/* Instruções */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Como usar:</strong></p>
          <p>1. Clique em "Escolher aba" e selecione a aba da videoconferência</p>
          <p>2. ⚠️ <strong>CRÍTICO:</strong> Marque "Compartilhar áudio" na caixa de diálogo</p>
          <p>3. Clique em "Iniciar transcrição" para ativar o reconhecimento de voz</p>
          <p>4. Fale próximo ao microfone para capturar sua voz durante a teleconsulta</p>
          <p className="text-green-600 font-medium">✨ Usa Dual LiveKit para transcrição em tempo real</p>
          <p className="text-blue-600 font-medium">🤖 OpenAI processa as transcrições para extrair dados da anamnese</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsentNote() {
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
      <div className="flex items-start space-x-2">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Consentimento obrigatório</p>
          <p className="mt-1">
            Ao iniciar, você confirma que informou o paciente e obteve consentimento para 
            gravação/transcrição da teleconsulta conforme a LGPD e regulamentações médicas.
          </p>
        </div>
      </div>
    </div>
  );
}
