'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Select components removidos para evitar erro de hidratação HTML
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Users, RefreshCw, Zap, User, Stethoscope, MessageCircle } from 'lucide-react';
import { useDualLivekitSTT } from '@/components/recording/hooks/use-dual-livekit-stt';
import { useRecordingStore } from '@/components/recording/store/recording-store';
import { DebugOverlay } from './DebugOverlay';

type Props = {
  consultationId: string;
};

export default function DualMicLiveKitTranscriber({ consultationId }: Props) {
  const dualLiveKit = useDualLivekitSTT({
    consultationId
  });

  // Usar o store para acessar as transcrições
  const { finalSegments, partialText } = useRecordingStore();

  // Carregar dispositivos na inicialização
  useEffect(() => {
    dualLiveKit.loadDevices();
  }, []); // Corrigido: remove loop infinito

  const handleConnect = () => {
    console.log('🔗 Tentando conectar Dual LiveKit para telemedicina...')
    console.log('🔍 Estado atual:', {
      doctorMic: dualLiveKit.doctorMic,
      patientMic: dualLiveKit.patientMic,
      isConnecting: dualLiveKit.isConnecting,
      isConnected: dualLiveKit.isConnected,
      devices: dualLiveKit.devices?.length || 0
    })
    
    // Verificar se ambos os microfones estão mapeados
    if (!dualLiveKit.doctorMic || !dualLiveKit.patientMic) {
      console.warn('⚠️ Microfones não selecionados')
      alert('Por favor, selecione os dois microfones (médico e paciente) para iniciar a transcrição');
      return;
    }
    
    console.log('✅ Microfones selecionados, conectando...')
    dualLiveKit.connect();
  };

  const getDoctorMicLabel = () => {
    const device = dualLiveKit.devices.find(d => d.deviceId === dualLiveKit.doctorMic);
    return device ? device.label : 'Nenhum selecionado';
  };

  const getPatientMicLabel = () => {
    const device = dualLiveKit.devices.find(d => d.deviceId === dualLiveKit.patientMic);
    return device ? device.label : 'Nenhum selecionado';
  };

  const testLiveKitConfig = async () => {
    console.log('🔍 Testando configuração do LiveKit...')
    
    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: consultationId,
          participantName: 'test-telemed',
          role: 'doctor'
        })
      })
      
      const data = await response.json()
      console.log('📡 Resposta da API LiveKit:', data)
      
      if (data.mock) {
        console.warn('⚠️ LiveKit em modo mock - variáveis não configuradas')
        alert('LiveKit não configurado! Verifique as variáveis de ambiente na Vercel.')
      } else {
        console.log('✅ LiveKit configurado corretamente')
        alert('LiveKit configurado! Token gerado com sucesso.')
      }
    } catch (error) {
      console.error('❌ Erro ao testar LiveKit:', error)
      alert('Erro ao testar LiveKit: ' + error.message)
    }
  }

  const getStatusBadge = () => {
    if (dualLiveKit.isConnecting) {
          {/* Debug Info */}
      <div className="p-2 bg-gray-100 rounded text-xs">
        <p>🔍 Debug: Segmentos: {finalSegments.length} | Texto parcial: {partialText ? 'Sim' : 'Não'}</p>
        <p>🔗 Conectado: {dualLiveKit.isConnected ? 'Sim' : 'Não'} | Conectando: {dualLiveKit.isConnecting ? 'Sim' : 'Não'}</p>
      </div>

  return (
        <Badge variant="outline" className="animate-pulse">
          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
          Conectando...
        </Badge>
      );
    }
    
    if (dualLiveKit.isConnected) {
      return (
        <Badge variant="default" className="bg-green-500">
          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
          Conectado
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
        Desconectado
      </Badge>
    );
  };

  const getSpeakerInfo = (segment: any) => {
    // Usar informação do speaker se disponível
    let isDoctor = false;
    
    if (segment.speaker) {
      isDoctor = segment.speaker === 'doctor';
    } else {
      // Fallback: usar heurística baseada no texto
      const text = segment.text || '';
      const lowerText = text.toLowerCase();
      
      // Se o texto contém informações médicas ou termos técnicos, provavelmente é o médico
      const medicalTerms = ['diagnóstico', 'exame', 'medicação', 'prescrição', 'sintoma', 'tratamento'];
      const isMedical = medicalTerms.some(term => lowerText.includes(term));
      
      // Alternar baseado no índice do segmento ou usar heurística médica
      const segmentIndex = finalSegments.indexOf(segment);
      isDoctor = isMedical || segmentIndex % 2 === 0;
    }
    
    return {
      speaker: isDoctor ? 'doctor' : 'patient',
      name: isDoctor ? 'Médico' : 'Paciente',
      color: isDoctor ? 'text-blue-600' : 'text-green-600',
      bgColor: isDoctor ? 'bg-blue-50' : 'bg-green-50',
      icon: isDoctor ? Stethoscope : User
    };
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span>Sistema Dual Mic LiveKit</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Captura simultânea de dois microfones com transcrição em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuração de Microfones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Microfone do Médico */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <label className="text-sm font-medium text-blue-700">
                  Microfone do Médico
                </label>
              </div>
              <select 
    value={dualLiveKit.doctorMic} 
    onChange={(e) => dualLiveKit.setDoctorMic(e.target.value)}
    disabled={dualLiveKit.isConnected}
    className="w-full p-2 border rounded-md bg-background"
  >
    <option value="">Selecione o microfone do médico</option>
    {dualLiveKit.devices.map((device) => (
      <option key={`doctor-${device.deviceId}`} value={device.deviceId}>
        {device.label}
      </option>
    ))}
  </select>
              {dualLiveKit.doctorMic && (
                <p className="text-xs text-muted-foreground">
                  ✅ {getDoctorMicLabel()}
                </p>
              )}
            </div>

            {/* Microfone do Paciente */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-green-600" />
                <label className="text-sm font-medium text-green-700">
                  Microfone do Paciente
                </label>
              </div>
              <select 
    value={dualLiveKit.patientMic} 
    onChange={(e) => dualLiveKit.setPatientMic(e.target.value)}
    disabled={dualLiveKit.isConnected}
    className="w-full p-2 border rounded-md bg-background"
  >
    <option value="">Selecione o microfone do paciente</option>
    {dualLiveKit.devices.map((device) => (
      <option key={`patient-${device.deviceId}`} value={device.deviceId}>
        {device.label}
      </option>
    ))}
  </select>
              {dualLiveKit.patientMic && (
                <p className="text-xs text-muted-foreground">
                  ✅ {getPatientMicLabel()}
                </p>
              )}
            </div>
          </div>

          {/* Status e Informações */}
          {dualLiveKit.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Erro:</strong> {dualLiveKit.error}
              </p>
            </div>
          )}

          {dualLiveKit.isConnected && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-700">
                  Sistema Ativo
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs text-green-600">
                <div>
                  <p><strong>Médico:</strong> {getDoctorMicLabel()}</p>
                </div>
                <div>
                  <p><strong>Paciente:</strong> {getPatientMicLabel()}</p>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Ambos os microfones estão capturando áudio simultaneamente
              </p>
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={dualLiveKit.loadDevices}
              disabled={dualLiveKit.isConnecting || dualLiveKit.isConnected}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar Dispositivos
            </Button>

            {!dualLiveKit.isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={
                  dualLiveKit.isConnecting || 
                  !dualLiveKit.doctorMic || 
                  !dualLiveKit.patientMic ||
                  !dualLiveKit.isSupported()
                }
                title={(!dualLiveKit.doctorMic || !dualLiveKit.patientMic) ? "Selecione os dois microfones para iniciar" : ""}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Mic className="h-4 w-4 mr-2" />
                {dualLiveKit.isConnecting ? 'Conectando...' : 
                  (dualLiveKit.doctorMic && dualLiveKit.patientMic) ? 'Conectar Dual Mic' : 
                  'Conectar Microfone'}
              </Button>
            ) : (
              <Button
                onClick={dualLiveKit.disconnect}
                variant="destructive"
              >
                <MicOff className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            )}

            <Button 
              onClick={testLiveKitConfig}
              variant="outline"
              size="sm"
            >
              🔍 Testar LiveKit
            </Button>
          </div>

          {/* Informações Técnicas */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
            <p><strong>Como funciona:</strong></p>
            <p>• Cada microfone grava independentemente em chunks de 3 segundos</p>
            <p>• O áudio é enviado para OpenAI Whisper com identificação do speaker</p>
            <p>• As transcrições são recebidas via Server-Sent Events em tempo real</p>
            <p>• Reconexão automática em caso de falha na conexão</p>
            
            <div className="flex items-center space-x-4 mt-2 pt-2 border-t">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Médico</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Paciente</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Transcrições - Sempre visível para debug */}
      {/* {(finalSegments.length > 0 || partialText) && ( */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <span>Transcrições em Tempo Real</span>
              <Badge variant="outline">{finalSegments.length} segmentos</Badge>
            </CardTitle>
            <CardDescription>
              Conversação entre médico e paciente com identificação automática
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full">
              <div className="space-y-3">
                {finalSegments.map((segment, index) => {
                  const speakerInfo = getSpeakerInfo(segment);
                  const SpeakerIcon = speakerInfo.icon;
                  
                  return (
                    <div
                      key={segment.id}
                      className={`p-3 rounded-lg border-l-4 ${speakerInfo.bgColor} ${
                        speakerInfo.speaker === 'doctor' ? 'border-l-blue-500' : 'border-l-green-500'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-1 rounded-full ${speakerInfo.speaker === 'doctor' ? 'bg-blue-100' : 'bg-green-100'}`}>
                          <SpeakerIcon className={`h-4 w-4 ${speakerInfo.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-semibold ${speakerInfo.color}`}>
                              {speakerInfo.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(segment.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{segment.text}</p>
                          {segment.confidence && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground">
                                Confiança: {Math.round(segment.confidence * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Texto parcial (em processamento) */}
                {partialText && (
                  <div className="p-3 rounded-lg border-l-4 bg-gray-50 border-l-gray-400 opacity-70">
                    <div className="flex items-start space-x-3">
                      <div className="p-1 rounded-full bg-gray-100">
                        <Mic className="h-4 w-4 text-gray-500 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-600">
                            Processando...
                          </span>
                          <Badge variant="outline" className="text-xs animate-pulse">
                            Em tempo real
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 italic">{partialText}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Estado vazio */}
                {finalSegments.length === 0 && !partialText && dualLiveKit.isConnected && (
                  <div className="text-center py-8">
                    <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Aguardando fala nos microfones...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      As transcrições aparecerão aqui em tempo real
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      {/* )} */}

      {/* Card de Aviso */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-white font-bold">!</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800">
                Requisitos Importantes
              </p>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Certifique-se de ter dois microfones conectados</li>
                <li>• Posicione um microfone próximo ao médico e outro ao paciente</li>
                <li>• Use fones de ouvido para evitar feedback de áudio</li>
                <li>• Teste os microfones antes de iniciar a consulta</li>
                <li>• Mantenha os microfones a uma distância adequada (20-30cm)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Debug Overlay */}
      <DebugOverlay 
        doctorActive={false}
        patientActive={false}
        doctorRms={0}
        patientRms={0}
        doctorFloorHold={0}
        patientFloorHold={0}
        currentSpeaker={undefined}
      />
    </div>
  );
}
