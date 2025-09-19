'use client';

import React, { useState, useCallback } from 'react';
import { AnamneseViewer } from './AnamneseViewer';
import { useAnamneseAi } from '@/hooks/use-anamnese-ai';
import { useRecordingStore } from '@/components/recording/store/recording-store';
import { Field } from '@/lib/anamnese-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Save, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';

interface AnamneseAIPanelProps {
  consultationId?: string;
  initialAnamnese?: any;
  onTranscriptReceived?: (callback: (text: string) => void) => void;
}

export function AnamneseAIPanel({ 
  consultationId, 
  initialAnamnese,
  onTranscriptReceived 
}: AnamneseAIPanelProps) {
  const [selectedField, setSelectedField] = useState<{
    section: string;
    field: string;
    data: Field;
  } | null>(null);
  const [testText, setTestText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const { addFinalSegment } = useRecordingStore();

  const {
    state,
    isProcessing,
    lastDeltas,
    addTranscriptChunk,
    confirmField,
    updateField,
    saveToConsultation,
    hasChanges
  } = useAnamneseAi({
    consultationId,
    initialState: initialAnamnese,
    onStateChange: (newState) => {
      // Estado da anamnese atualizado
    },
    onError: (error) => {
      console.error('Erro na anamnese IA:', error);
    }
  });

  // Estabilizar a função de callback
  const stableCallback = useCallback((text: string) => {
    addTranscriptChunk(text, false);
  }, [addTranscriptChunk]);

  // Registrar callback apenas uma vez
  React.useEffect(() => {
    if (onTranscriptReceived) {
      console.log('🔗 Registrando callback único da anamnese...')
      onTranscriptReceived(stableCallback);
    }
  }, []); // Sem dependências - apenas uma vez

  const handleSave = async () => {
    if (!consultationId) return;

    try {
      setSaveStatus('saving');
      await saveToConsultation();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleFieldClick = (sectionKey: string, fieldKey: string, field: Field) => {
    setSelectedField({
      section: sectionKey,
      field: fieldKey,
      data: field
    });
  };

  const handleFieldUpdate = (updates: Partial<Field>) => {
    if (!selectedField) return;
    
    updateField(selectedField.section, selectedField.field, updates);
    setSelectedField({
      ...selectedField,
      data: { ...selectedField.data, ...updates }
    });
  };

  const handleTestSubmit = () => {
    if (testText.trim()) {
      addTranscriptChunk(testText, true);
      setTestText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Anamnese com IA
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastDeltas.length > 0 && (
                <Badge variant="outline" className="text-green-600">
                  {lastDeltas.length} campos atualizados
                </Badge>
              )}
              {consultationId && (
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saveStatus === 'saving'}
                  size="sm"
                  variant={saveStatus === 'saved' ? 'default' : 'outline'}
                >
                  {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {saveStatus === 'saved' && <CheckCircle className="h-4 w-4 mr-1" />}
                  {saveStatus === 'error' && <AlertCircle className="h-4 w-4 mr-1" />}
                  {saveStatus === 'idle' && <Save className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* Área de teste */}
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Teste a IA ou use dados da transcrição em tempo real:
            </div>
            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => addTranscriptChunk("Meu nome é João Silva, tenho 42 anos, sou masculino", true)}
                disabled={isProcessing}
                size="sm"
                variant="outline"
              >
                Teste Identificação
              </Button>
              <Button
                onClick={() => addTranscriptChunk("Minha queixa é dor no peito há 3 dias", true)}
                disabled={isProcessing}
                size="sm"
                variant="outline"
              >
                Teste Queixa
              </Button>
              <Button
                onClick={() => {
                  // Simular adição de segmento ao store para testar integração
                  console.log('🎤 Simulando novo segmento de transcrição...')
                  addFinalSegment({
                    text: "Meu nome é Maria Santos, tenho 35 anos, moro em Campinas",
                    startMs: Date.now(),
                    endMs: Date.now() + 5000,
                    confidence: 0.9,
                    isPartial: false
                  })
                }}
                disabled={isProcessing}
                size="sm"
                variant="secondary"
              >
                Simular Transcrição
              </Button>
              <Button
                onClick={() => {
                  // Testar callback simples
                  console.log('🔗 Testando sistema de callback...')
                  addTranscriptChunk('Teste de callback do sistema')
                }}
                size="sm"
                variant="outline"
              >
                Testar Callback
              </Button>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Ex: Meu nome é João Silva, tenho 42 anos, sou masculino, moro em São Paulo. Minha queixa principal é dor no peito há 3 dias que piora quando subo escada..."
                className="flex-1"
                rows={3}
              />
              <Button
                onClick={handleTestSubmit}
                disabled={!testText.trim() || isProcessing}
                className="self-end"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Últimas alterações */}
      {lastDeltas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimas Alterações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lastDeltas.slice(0, 5).map((delta, index) => (
                <div key={index} className="text-xs p-2 bg-blue-50 rounded border">
                  <div className="font-medium">{delta.path}</div>
                  <div className="text-gray-600">
                    {delta.to?.value ? `"${delta.to.value}"` : 'Removido'}
                    {delta.to?.confidence && ` (${Math.round(delta.to.confidence * 100)}%)`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualizador da anamnese */}
      <AnamneseViewer
        anamnese={state}
        onFieldClick={handleFieldClick}
      />

      {/* Modal de edição de campo */}
      <Dialog open={!!selectedField} onOpenChange={() => setSelectedField(null)}>
        {selectedField && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Campo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor</label>
                <Textarea
                  value={selectedField.data.value || ''}
                  onChange={(e) => handleFieldUpdate({ value: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Confiança (%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((selectedField.data.confidence || 0) * 100)}
                  onChange={(e) => handleFieldUpdate({ confidence: parseInt(e.target.value) / 100 })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">
                  {Math.round((selectedField.data.confidence || 0) * 100)}%
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Texto de evidência</label>
                <Textarea
                  value={selectedField.data.evidence_text || ''}
                  onChange={(e) => handleFieldUpdate({ evidence_text: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedField.data.confirmed}
                  onChange={(e) => handleFieldUpdate({ confirmed: e.target.checked })}
                />
                <label className="text-sm">Campo confirmado</label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    confirmField(selectedField.section, selectedField.field);
                    setSelectedField(null);
                  }}
                  variant="default"
                >
                  Confirmar
                </Button>
                <Button
                  onClick={() => setSelectedField(null)}
                  variant="outline"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
