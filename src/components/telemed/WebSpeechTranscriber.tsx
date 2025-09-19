'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mic, MicOff, RefreshCw, Settings, MessageCircle, AlertCircle } from 'lucide-react'
import { useWebSpeechAPI } from '@/hooks/use-web-speech-api'
import { useRecordingStore } from '@/store/recording-store'

interface WebSpeechTranscriberProps {
  consultationId: string
}

export default function WebSpeechTranscriber({ consultationId }: WebSpeechTranscriberProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [segments, setSegments] = useState<Array<{ id: string; text: string; timestamp: number }>>([])
  
  const webSpeech = useWebSpeechAPI()
  const { addFinalSegment } = useRecordingStore()

  // Processar transcrições finais
  useEffect(() => {
    if (webSpeech.finalTranscript && webSpeech.finalTranscript !== segments[segments.length - 1]?.text) {
      const newSegment = {
        id: `segment-${Date.now()}-${Math.random()}`,
        text: webSpeech.finalTranscript,
        timestamp: Date.now()
      }
      
      setSegments(prev => [...prev, newSegment])
      
      // Enviar para o store de gravação
      addFinalSegment({
        id: newSegment.id,
        text: newSegment.text,
        speaker: 'doctor', // Web Speech API não diferencia speakers
        timestamp: newSegment.timestamp,
        confidence: 1.0
      })
    }
  }, [webSpeech.finalTranscript, addFinalSegment, segments])

  const handleStart = () => {
    webSpeech.clearTranscript()
    setSegments([])
    webSpeech.startListening()
  }

  const handleStop = () => {
    webSpeech.stopListening()
  }

  const handleClear = () => {
    webSpeech.clearTranscript()
    setSegments([])
  }

  const getStatusBadge = () => {
    if (webSpeech.isConnecting) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Conectando...</Badge>
    }
    if (webSpeech.isConnected && webSpeech.isListening) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Ouvindo</Badge>
    }
    if (webSpeech.error) {
      return <Badge variant="destructive">Erro</Badge>
    }
    return <Badge variant="outline" className="bg-gray-100 text-gray-800">Parado</Badge>
  }

  if (!webSpeech.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>Web Speech API Não Suportada</span>
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta a Web Speech API. Use Chrome, Edge ou Safari para transcrição de voz.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5 text-purple-600" />
                <span>Transcrição por Voz</span>
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Transcrição em tempo real usando Web Speech API nativa do navegador
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Configurações */}
          {showSettings && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Select value="pt-BR" onValueChange={webSpeech.setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="continuous"
                    checked={true}
                    onCheckedChange={webSpeech.setContinuous}
                  />
                  <Label htmlFor="continuous">Contínuo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="interim"
                    checked={true}
                    onCheckedChange={webSpeech.setInterimResults}
                  />
                  <Label htmlFor="interim">Resultados Intermediários</Label>
                </div>
              </div>
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap gap-2">
            {!webSpeech.isListening ? (
              <Button
                onClick={handleStart}
                disabled={webSpeech.isConnecting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Mic className="h-4 w-4 mr-2" />
                {webSpeech.isConnecting ? 'Conectando...' : 'Iniciar Transcrição'}
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                variant="destructive"
              >
                <MicOff className="h-4 w-4 mr-2" />
                Parar Transcrição
              </Button>
            )}

            <Button
              onClick={handleClear}
              variant="outline"
              disabled={webSpeech.isListening}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>

          {/* Erro */}
          {webSpeech.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{webSpeech.error}</span>
              </div>
            </div>
          )}

          {/* Status de Conexão */}
          {webSpeech.isConnected && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-800">
                  Sistema ativo - {segments.length} segmentos transcritos
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Transcrições */}
      {(segments.length > 0 || webSpeech.transcript) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <span>Transcrições</span>
              <Badge variant="outline">{segments.length} segmentos</Badge>
            </CardTitle>
            <CardDescription>
              Transcrições em tempo real da consulta
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Transcrições Finais */}
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-blue-900">{segment.text}</p>
                    <span className="text-xs text-blue-600 ml-2">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))}

              {/* Transcrição Intermediária */}
              {webSpeech.transcript && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 italic">
                    {webSpeech.transcript}
                    <span className="text-xs text-gray-500 ml-2">(digitando...)</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>Como funciona:</strong></p>
          <p>• Usa a Web Speech API nativa do navegador</p>
          <p>• Não requer configuração de servidor ou APIs externas</p>
          <p>• Funciona offline (processamento local)</p>
          <p>• Suporte limitado a um microfone por vez</p>
          <p>• Requer navegador moderno (Chrome, Edge, Safari)</p>
        </CardContent>
      </Card>
    </div>
  )
}
