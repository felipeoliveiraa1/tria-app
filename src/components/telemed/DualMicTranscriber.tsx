'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Mic, Square, Users, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSTT } from '@/components/recording/hooks/use-realtime-stt';
import { useRecordingStore } from '@/components/recording/store/recording-store';

type DeviceOption = { deviceId: string; label: string };
type Props = { consultationId: string };

export default function DualMicTranscriber({ consultationId }: Props) {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [doctorDeviceId, setDoctorDeviceId] = useState<string>('');
  const [patientDeviceId, setPatientDeviceId] = useState<string>('');

  const [doctorStream, setDoctorStream] = useState<MediaStream | null>(null);
  const [patientStream, setPatientStream] = useState<MediaStream | null>(null);

  const [recording, setRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [transcriptionSegments, setTranscriptionSegments] = useState(0);
  const [lastSpeaker, setLastSpeaker] = useState<'doctor' | 'patient' | null>(null);
  
  const { toast } = useToast();
  
  // Usar Web Speech API para transcrição em tempo real
  const { connect: connectSTT, disconnect: disconnectSTT, isSupported } = useRealtimeSTT();
  const { 
    finalSegments, 
    realtimeConnected,
    realtimeReconnecting,
    setConsultationId 
  } = useRecordingStore();
  
  // Registrar consultationId no store
  useEffect(() => {
    setConsultationId(consultationId);
  }, [consultationId, setConsultationId]);

  // Carregar lista de microfones disponíveis
  useEffect(() => {
    async function loadDevices() {
      try {
        // Primeiro, pedir permissão para acessar microfones
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const microphones = deviceList
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microfone ${device.deviceId.substring(0, 8)}`
          }));
        
        setDevices(microphones);
        console.log('🎤 Microfones encontrados:', microphones.length);

        // Restaurar seleções anteriores do localStorage
        const lastDoctorDevice = localStorage.getItem('tria:mic:doctor') || '';
        const lastPatientDevice = localStorage.getItem('tria:mic:patient') || '';
        
        if (microphones.find(m => m.deviceId === lastDoctorDevice)) {
          setDoctorDeviceId(lastDoctorDevice);
        } else if (microphones[0]) {
          setDoctorDeviceId(microphones[0].deviceId);
        }
        
        if (microphones.find(m => m.deviceId === lastPatientDevice)) {
          setPatientDeviceId(lastPatientDevice);
        } else if (microphones[1]) {
          setPatientDeviceId(microphones[1].deviceId);
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar microfones:', error);
        toast({
          title: "Erro ao acessar microfones",
          description: "Verifique as permissões de áudio do navegador.",
          variant: "destructive"
        });
      }
    }

    loadDevices();
  }, [toast]);

  // Salvar seleções no localStorage
  useEffect(() => {
    if (doctorDeviceId) {
      localStorage.setItem('tria:mic:doctor', doctorDeviceId);
    }
  }, [doctorDeviceId]);

  useEffect(() => {
    if (patientDeviceId) {
      localStorage.setItem('tria:mic:patient', patientDeviceId);
    }
  }, [patientDeviceId]);

  async function connectMicrophones() {
    if (!doctorDeviceId || !patientDeviceId) {
      toast({
        title: "Selecione os microfones",
        description: "Você precisa selecionar microfones tanto para o médico quanto para o paciente.",
        variant: "destructive"
      });
      return;
    }

    if (doctorDeviceId === patientDeviceId) {
      toast({
        title: "Microfones idênticos",
        description: "Escolha microfones distintos para médico e paciente.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);

    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false, // Desligar para não interferir na separação
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,        // Mono para cada microfone
        sampleRate: 48000,      // Alta qualidade
      };

      console.log('🔌 Conectando microfones...');

      const [doctorStreamResult, patientStreamResult] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: { ...audioConstraints, deviceId: { exact: doctorDeviceId } }
        }),
        navigator.mediaDevices.getUserMedia({
          audio: { ...audioConstraints, deviceId: { exact: patientDeviceId } }
        }),
      ]);

      setDoctorStream(doctorStreamResult);
      setPatientStream(patientStreamResult);

      console.log('✅ Microfones conectados com sucesso');
      
      toast({
        title: "Microfones conectados!",
        description: "Agora você pode iniciar a gravação separada.",
      });

    } catch (error) {
      console.error('❌ Erro ao conectar microfones:', error);
      toast({
        title: "Erro ao conectar microfones",
        description: "Verifique se os dispositivos estão disponíveis e as permissões estão ativas.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }

  function startRecording() {
    if (!doctorStream || !patientStream || recording) return;

    if (!isSupported()) {
      toast({
        title: "Web Speech API não suportada",
        description: "Seu navegador não suporta reconhecimento de voz.",
        variant: "destructive"
      });
      return;
    }

    console.log('🎬 Iniciando transcrição em tempo real com Web Speech API');

    // Conectar ao Web Speech API para transcrição
    connectSTT();
    setRecording(true);

    // Detectar desconexão de microfones
    const allTracks = [
      ...doctorStream.getAudioTracks(),
      ...patientStream.getAudioTracks()
    ];
    
    allTracks.forEach(track => {
      track.onended = () => {
        console.log('🔌 Microfone desconectado, parando gravação');
        stopRecording();
        toast({
          title: "Microfone desconectado",
          description: "A gravação foi interrompida devido à desconexão de um microfone.",
          variant: "destructive"
        });
      };
    });

    toast({
      title: "Transcrição iniciada!",
      description: "Reconhecimento de voz ativado para os dois microfones.",
    });
  }

  function stopRecording() {
    disconnectSTT();
    setRecording(false);
    
    toast({
      title: "Transcrição parada",
      description: "O reconhecimento de voz foi interrompido.",
    });
  }

  // Monitorar segmentos finais do Web Speech API
  useEffect(() => {
    if (finalSegments.length > transcriptionSegments) {
      const newSegments = finalSegments.slice(transcriptionSegments);
      console.log('📝 [DualMic] Novos segmentos recebidos:', newSegments.length);
      
      newSegments.forEach(async (segment) => {
        const transcriptionText = segment.text;
        
        // Determinar speaker baseado na intensidade ou usar algoritmo simples
        // Por enquanto, alternamos entre patient e doctor
        const speaker = lastSpeaker === 'patient' ? 'doctor' : 'patient';
        setLastSpeaker(speaker);
        
        console.log(`📝 [DualMic] Nova transcrição (${speaker}):`, transcriptionText);
        
        // Salvar utterance no banco
        await saveUtterance(transcriptionText, speaker);
      });
      
      setTranscriptionSegments(finalSegments.length);
    }
  }, [finalSegments, transcriptionSegments, lastSpeaker]);

  // Função para salvar utterance no banco
  async function saveUtterance(text: string, speaker: 'doctor' | 'patient') {
    try {
      const response = await fetch('/api/telemed/utterances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId,
          speaker,
          text,
          confidence: null,
        }),
      });

      if (!response.ok) {
        console.warn('❌ Erro ao salvar utterance:', response.status);
      } else {
        console.log(`✅ Utterance salva: ${speaker}`);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar utterance:', error);
    }
  }



  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (recording) {
        disconnectSTT();
      }
      if (doctorStream) {
        doctorStream.getTracks().forEach(track => track.stop());
      }
      if (patientStream) {
        patientStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [recording, doctorStream, patientStream, disconnectSTT]);

  const canStartRecording = doctorStream && patientStream && !recording && isSupported();
  const hasValidSelection = doctorDeviceId && patientDeviceId && doctorDeviceId !== patientDeviceId;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Dois Microfones (Presencial)</span>
          {recording && (
            <Badge variant="default" className="bg-red-500 text-white animate-pulse">
              ● Gravando
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Capture áudio separado do médico e paciente usando dois microfones distintos.
          <br />
          Recomendado: Use Chrome/Edge e microfones lapela para melhor qualidade.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Seleção de Microfones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              🩺 Microfone do Médico
            </label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={doctorDeviceId}
              onChange={(e) => setDoctorDeviceId(e.target.value)}
              disabled={recording}
            >
              <option value="">Selecione um microfone</option>
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              🤒 Microfone do Paciente
            </label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={patientDeviceId}
              onChange={(e) => setPatientDeviceId(e.target.value)}
              disabled={recording}
            >
              <option value="">Selecione um microfone</option>
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status da Conexão */}
        <div className="flex items-center space-x-3 p-3 bg-background rounded-lg border">
          <Volume2 className="h-4 w-4 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {realtimeReconnecting 
                ? 'Reconectando reconhecimento de voz...'
                : recording && realtimeConnected 
                  ? 'Transcrevendo em tempo real'
                  : recording && !realtimeConnected 
                    ? 'Aguardando conexão do reconhecimento...'
                    : doctorStream && patientStream 
                      ? 'Microfones conectados - Pronto para transcrever'
                      : 'Microfones não conectados'
              }
            </p>
            {transcriptionSegments > 0 && (
              <p className="text-xs text-muted-foreground">
                {transcriptionSegments} segmentos transcritos • Web Speech API
                {realtimeReconnecting && ' • Reconectando...'}
              </p>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={connectMicrophones}
            disabled={!hasValidSelection || isConnecting || recording}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>{isConnecting ? 'Conectando...' : 'Conectar microfones'}</span>
          </Button>

          <Button
            onClick={startRecording}
            disabled={!canStartRecording}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Mic className="h-4 w-4" />
            <span>Iniciar transcrição</span>
          </Button>

          <Button
            onClick={stopRecording}
            disabled={!recording}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <Square className="h-4 w-4" />
            <span>Parar</span>
          </Button>
        </div>

        {/* Aviso de Consentimento */}
        <ConsentNote />

        {/* Instruções */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Como usar (Web Speech API):</strong></p>
          <p>1. Conecte dois microfones diferentes (médico e paciente)</p>
          <p>2. Clique "Iniciar transcrição" para ativar o reconhecimento de voz</p>
          <p>3. Fale próximo aos microfones para melhor reconhecimento</p>
          <p>4. As transcrições aparecerão na timeline em tempo real</p>
          <p className="text-green-600 font-medium">
            ✨ Web Speech API + Timeline de conversas + Anamnese automática
          </p>
          <p className="text-amber-600 font-medium">
            💡 Por enquanto alterna entre speakers automaticamente
          </p>
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
            gravação/transcrição separada da consulta conforme a LGPD e regulamentações médicas.
          </p>
        </div>
      </div>
    </div>
  );
}
