'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ANAMNESE_SECTIONS, AnamneseItem } from './anamnese-questions';
import { analyzeTranscriptionForAnamnese, getSuggestionsForCurrentQuestion } from './anamnese-ai-matcher';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useRecordingStore } from '@/components/recording/store/recording-store';
import './anamnese-paper.css';

type Props = {
  consultationId?: string;         // se informado, faz autosave na API
  initialAnswers?: Record<string, string>; // opcional para editar respostas prévias
};

// Removido: Hook STT autônomo - agora usa recording store

// persistência simples no storage (com try/catch)
const safeGet = <T,>(k: string): T | null => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
};
const safeSet = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function AnamneseRunner({ consultationId, initialAnswers }: Props) {
  const ALL: AnamneseItem[] = ANAMNESE_SECTIONS.flatMap(s => s.items);
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialAnswers ?? safeGet<Record<string, string>>('tria:anamnese:draft') ?? {}
  );
  const [currentId, setCurrentId] = useState<string>(ALL[0]?.id ?? '');
  const current = useMemo(() => ALL.find(i => i.id === currentId), [ALL, currentId]);
  const [textareaValue, setTextareaValue] = useState('');
  const [fullTranscription, setFullTranscription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{ questionId: string; answer: string; confidence: number; section: string }[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<string[]>([]);
  const [lastProcessedSegmentCount, setLastProcessedSegmentCount] = useState(0);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [recentAutoFills, setRecentAutoFills] = useState<string[]>([]);

  // Usar recording store em vez de STT próprio
  const { partialText, finalSegments } = useRecordingStore();

  // salvar rascunho local
  useEffect(() => { safeSet('tria:anamnese:draft', answers); }, [answers]);

  // autosave remoto (consulta) — opcional
  const saveRemote = useMemo(() => {
    if (!consultationId) return null;
    return async (data: Record<string, string>) => {
      try {
        await fetch('/api/consultations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ id: consultationId, anamnese: data }),
        });
      } catch (error) {
        console.error('Erro ao salvar anamnese:', error);
      }
    };
  }, [consultationId]);

  // Processar novos segmentos finais da transcrição - SISTEMA INTELIGENTE NÃO-LINEAR
  useEffect(() => {
    if (finalSegments.length <= lastProcessedSegmentCount) return;
    
    // Pegar apenas os novos segmentos
    const newSegments = finalSegments.slice(lastProcessedSegmentCount);
    const newText = newSegments.map(s => s.text).join(' ');
    
    if (!newText.trim()) return;
    
    console.log('🎙️ NOVO TEXTO DETECTADO:', {
      newText: newText.substring(0, 100) + '...',
      segmentCount: newSegments.length,
      totalSegments: finalSegments.length,
      currentQuestion: current?.id,
      currentLabel: current?.label
    });
    
    // Atualizar contador de segmentos processados
    setLastProcessedSegmentCount(finalSegments.length);
    
    // Adicionar à transcrição completa
    setFullTranscription(prev => {
      const updated = prev + ' ' + newText;
      console.log('📝 TRANSCRIÇÃO COMPLETA ATUALIZADA:', updated.substring(-200));
      return updated;
    });
    
    // 🧠 ANÁLISE INTELIGENTE: Detectar TODAS as respostas possíveis
    console.log('🤖 INICIANDO ANÁLISE IA...');
    const allDetections = analyzeTranscriptionForAnamnese(newText, current?.id);
    
    if (allDetections.length > 0) {
      console.log('🎉 IA DETECTOU RESPOSTAS:', allDetections.map(d => ({
        pergunta: d.questionId,
        resposta: d.answer,
        confianca: Math.round(d.confidence * 100) + '%',
        secao: d.section
      })));
      
      // 📝 PREENCHIMENTO MÚLTIPLO: Preencher todas as respostas com alta confiança
      const highConfidenceAnswers = allDetections.filter(d => d.confidence > 0.7);
      console.log('🎯 ALTA CONFIANÇA (>70%):', highConfidenceAnswers.map(d => `${d.questionId}: ${Math.round(d.confidence * 100)}%`));
      
      const newAnswers = { ...answers };
      const autoFilledQuestions: string[] = [];
      
      highConfidenceAnswers.forEach(detection => {
        // Só preencher se ainda não foi respondida
        if (!answers[detection.questionId]?.trim()) {
          newAnswers[detection.questionId] = detection.answer;
          autoFilledQuestions.push(detection.questionId);
          console.log(`✅ AUTO-PREENCHIDO: ${detection.questionId} = "${detection.answer}" (confiança: ${Math.round(detection.confidence * 100)}%)`);
        } else {
          console.log(`⏭️ IGNORADO (já respondido): ${detection.questionId} = "${answers[detection.questionId]}"`);
        }
      });
      
      // Salvar todas as alterações de uma vez
      if (autoFilledQuestions.length > 0) {
        setAnswers(newAnswers);
        setRecentAutoFills(autoFilledQuestions);
        if (saveRemote) saveRemote(newAnswers).catch(() => {});
        
        // 🎯 NAVEGAÇÃO INTELIGENTE: Ir para próxima pergunta não respondida
        if (autoAdvanceEnabled) {
          console.log('🔄 NAVEGAÇÃO AUTOMÁTICA ATIVADA - buscando próxima pergunta...');
          
          setTimeout(() => {
            // Encontrar próxima pergunta não respondida
            const nextUnanswered = ALL.find(q => !newAnswers[q.id]?.trim());
            if (nextUnanswered) {
              console.log(`🎯 NAVEGANDO PARA: ${nextUnanswered.id} - "${nextUnanswered.label}"`);
              setCurrentId(nextUnanswered.id);
            } else {
              console.log('🏁 TODAS AS PERGUNTAS RESPONDIDAS! Anamnese completa.');
            }
          }, 1500);
        } else {
          console.log('⏸️ NAVEGAÇÃO AUTOMÁTICA DESABILITADA');
        }
        
        // Atualizar pergunta atual se foi preenchida
        if (current && newAnswers[current.id] && !answers[current.id]) {
          setTextareaValue(newAnswers[current.id]);
        }
      }
      
      // 💡 SUGESTÕES: Mostrar sugestões para pergunta atual se não foi auto-preenchida
      if (current && !highConfidenceAnswers.some(d => d.questionId === current.id)) {
        const currentSuggestions = allDetections.filter(s => s.questionId === current.id);
        if (currentSuggestions.length > 0) {
          setPendingSuggestions(currentSuggestions.map(s => s.answer));
        }
      }
      
      // 🔍 BANCO DE SUGESTÕES: Armazenar sugestões de média confiança para outras perguntas
      const mediumConfidenceSuggestions = allDetections.filter(d => 
        d.confidence >= 0.4 && d.confidence < 0.7 && !answers[d.questionId]?.trim()
      );
      
      setAiSuggestions(prev => {
        const filtered = prev.filter(p => !autoFilledQuestions.includes(p.questionId));
        return [...filtered, ...mediumConfidenceSuggestions].slice(-15);
      });
    }
  }, [finalSegments, lastProcessedSegmentCount, current, answers, saveRemote, ALL, autoAdvanceEnabled]);

  // Atualizar textarea quando mudar de pergunta
  useEffect(() => {
    if (current) {
      setTextareaValue(answers[current.id] || '');
      setPendingSuggestions([]); // Limpar sugestões pendentes ao mudar de pergunta
    }
  }, [current, answers]);

  // Analisar transcrição em tempo real (partialText) para sugestões
  useEffect(() => {
    if (!partialText || !current || partialText.length < 10) return;
    
    const suggestions = getSuggestionsForCurrentQuestion(partialText, current.id);
    if (suggestions.length > 0) {
      setPendingSuggestions(suggestions.slice(0, 2)); // Máximo 2 sugestões
    }
  }, [partialText, current]);

  // UI helpers
  const isAnswered = (id: string) => Boolean(answers[id]?.trim());
  const currentValue = textareaValue || partialText;
  
  // Debug logs
  console.log('🔍 AnamneseRunner Debug:', {
    currentId,
    current: current?.label,
    hasAnswers: Object.keys(answers).length,
    textareaValue,
    partialText: partialText?.substring(0, 50) + '...'
  });

  return (
    <div className="w-full max-w-none">
      {/* Ficha Médica - Papel Branco */}
      <div className="medical-paper bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden relative">
        {/* Cabeçalho da Ficha */}
        <div className="medical-section-header bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">📋 FICHA DE ANAMNESE</h2>
              <p className="text-sm text-blue-700">Prontuário Médico Digital</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded border ${partialText ? 'bg-green-500/10 border-green-500/40' : 'opacity-60'}`}>
                {partialText ? 'Analisando…' : 'Aguardando transcrição'}
              </span>
              {aiSuggestions.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🤖 {aiSuggestions.length} sugestões
                </Badge>
              )}
              {recentAutoFills.length > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300">
                  ⚡ {recentAutoFills.length} auto-preenchidas
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoAdvanceEnabled(!autoAdvanceEnabled)}
                className={`text-xs ${autoAdvanceEnabled ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                {autoAdvanceEnabled ? '🔄 Auto' : '⏸️ Manual'}
              </Button>
            </div>
          </div>
        </div>

        {/* Papel da Ficha Médica */}
        <div className="medical-paper-lines p-6 bg-white relative">
          <div className="space-y-8">
            
            {/* Renderizar cada seção como formulário médico */}
            {ANAMNESE_SECTIONS.map(section => (
              <div key={section.id} className="medical-section-header border-l-4 border-blue-400 pl-4 py-2 rounded-r">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  {section.title}
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {section.items.map(item => {
                    const isCurrentQuestion = currentId === item.id;
                    const hasAnswer = isAnswered(item.id);
                    const hasAISuggestion = aiSuggestions.some(s => s.questionId === item.id);
                    const wasAutoFilled = recentAutoFills.includes(item.id);
                    
                    return (
                      <div 
                        key={item.id}
                        className={`medical-form-field p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isCurrentQuestion 
                            ? 'active border-blue-400 bg-blue-50' 
                            : hasAnswer 
                            ? 'filled border-green-300 bg-green-50' 
                            : 'border-gray-200 bg-gray-50'
                        } ${wasAutoFilled ? 'auto-filled' : ''}`}
                        onClick={() => setCurrentId(item.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700 cursor-pointer">
                            {item.label}
                          </label>
                          <div className="flex items-center gap-1">
                            {hasAISuggestion && (
                              <Badge variant="secondary" className="text-xs">AI</Badge>
                            )}
                            {wasAutoFilled && (
                              <Badge variant="outline" className="text-xs bg-yellow-50">Auto</Badge>
                            )}
                            <span className={`w-3 h-3 rounded-full ${
                              hasAnswer ? 'bg-green-500' : 
                              hasAISuggestion ? 'bg-blue-500' : 
                              wasAutoFilled ? 'bg-yellow-500' : 'bg-gray-300'
                            }`} />
                          </div>
                        </div>
                        
                        <div className="relative">
                          {isCurrentQuestion ? (
                            <Textarea
                              value={currentValue}
                              onChange={(e) => setTextareaValue(e.target.value)}
                              placeholder="Digite ou fale a resposta..."
                              className="handwriting-font w-full min-h-[60px] text-sm bg-white border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          ) : (
                            <div 
                              className={`handwriting-font w-full min-h-[60px] p-2 text-sm bg-white border rounded cursor-pointer transition-all ${
                                hasAnswer ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setCurrentId(item.id)}
                            >
                              {answers[item.id] || (
                                <span className="text-gray-400 italic">
                                  {hasAISuggestion ? '💡 Clique para ver sugestão da IA...' : '📝 Clique para preencher...'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* Painel de Sugestões da IA - Flutuante na Pergunta Atual */}
            {current && (pendingSuggestions.length > 0 || aiSuggestions.some(s => s.questionId === currentId)) && (
              <div className="ai-suggestion-card mt-4 p-4 rounded-lg shadow-sm">
                <h4 className="text-sm font-medium text-blue-800 mb-2">🤖 Sugestões da IA para: "{current.label}"</h4>
                
                {/* Sugestões Pendentes */}
                {pendingSuggestions.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <div className="text-xs text-yellow-700">💡 Sugestões baseadas na fala:</div>
                    {pendingSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTextareaValue(suggestion);
                          setPendingSuggestions([]);
                        }}
                        className="ai-suggestion-button block w-full text-left text-sm p-2 rounded"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sugestões Automáticas */}
                {aiSuggestions.filter(s => s.questionId === currentId).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const next = { ...answers, [currentId]: suggestion.answer };
                      setAnswers(next);
                      setTextareaValue(suggestion.answer);
                      if (saveRemote) saveRemote(next).catch(() => {});
                      setAiSuggestions(prev => prev.filter(s => s.questionId !== currentId));
                    }}
                    className="ai-suggestion-button block w-full text-left text-sm p-2 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <span>{suggestion.answer}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Painel de Debug Inteligente - SEMPRE VISÍVEL */}
            <div className="mt-4 p-4 bg-gray-100 rounded-lg border-l-4 border-blue-500">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">🔍 Debug do Sistema IA</h4>
              
              {/* Status da Transcrição */}
              <div className="text-xs text-gray-600 mb-2">
                <strong>📡 Transcrição:</strong> {finalSegments.length} segmentos processados | 
                Texto atual: "{partialText?.substring(0, 40) || 'nenhum'}..."
              </div>
              
              {/* Status da Pergunta Atual */}
              <div className="text-xs text-gray-600 mb-2">
                <strong>❓ Pergunta Atual:</strong> {currentId} - "{current?.label || 'undefined'}"<br/>
                <strong>💬 Resposta Atual:</strong> "{answers[currentId] || textareaValue || 'vazio'}"
              </div>
              
              {/* Status do Sistema IA */}
              <div className="text-xs text-gray-600 mb-2">
                <strong>🤖 IA:</strong> {Object.keys(answers).length} respostas | 
                {aiSuggestions.length} sugestões | 
                {recentAutoFills.length} auto-preenchidas recentes |
                Auto-avanço: {autoAdvanceEnabled ? '🔄 ON' : '⏸️ OFF'}
              </div>
              
              {/* Sugestões IA Ativas */}
              {aiSuggestions.length > 0 && (
                <div className="text-xs text-blue-700 mb-2">
                  <strong>💡 Sugestões ativas:</strong> {aiSuggestions.map(s => 
                    `${s.questionId}(${Math.round(s.confidence * 100)}%)`
                  ).join(', ')}
                </div>
              )}
              
              {/* Auto-preenchimentos Recentes */}
              {recentAutoFills.length > 0 && (
                <div className="text-xs text-green-700 mb-2">
                  <strong>⚡ Últimos auto-preenchimentos:</strong> {recentAutoFills.join(', ')}
                </div>
              )}
            </div>
            
            {/* Botões de Ação */}
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-xs text-yellow-800 mb-2">
                <strong>🧪 TESTES DEBUG:</strong> Use estes botões para testar o sistema
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    alert('🧹 BOTÃO CLICADO! Verificando console...');
                    console.log('🧹 BOTÃO LIMPAR CLICADO');
                    console.log('📊 Estado antes:', { 
                      currentId, 
                      answer: answers[currentId], 
                      textareaValue,
                      allAnswers: answers 
                    });
                    
                    try {
                      const updatedAnswers = { ...answers };
                      delete updatedAnswers[currentId];
                      
                      console.log('📊 Estado depois:', { updatedAnswers, currentId });
                      
                      setAnswers(updatedAnswers);
                      setTextareaValue('');
                      setPendingSuggestions([]);
                      // Remover das sugestões AI também
                      setAiSuggestions(prev => prev.filter(s => s.questionId !== currentId));
                      
                      // Forçar atualização do localStorage
                      try {
                        localStorage.setItem('tria:anamnese:draft', JSON.stringify(updatedAnswers));
                        console.log('💾 LocalStorage atualizado manualmente');
                      } catch (err) {
                        console.error('❌ Erro localStorage:', err);
                      }
                      
                      // Salvar estado limpo
                      if (saveRemote) {
                        console.log('💾 Salvando remotamente...');
                        saveRemote(updatedAnswers).catch((err) => {
                          console.error('❌ Erro ao salvar:', err);
                        });
                      }
                      
                      console.log('✅ Limpeza concluída');
                      alert('✅ Limpeza executada! Campo deve estar vazio agora.');
                      
                    } catch (error) {
                      console.error('❌ ERRO na limpeza:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                      alert('❌ ERRO: ' + errorMessage);
                    }
                  }}
                >
                  🧹 LIMPAR TESTE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    alert('🔥 LIMPEZA FORÇADA - Zerando tudo!');
                    console.log('🔥 LIMPEZA FORÇADA DE TODOS OS ESTADOS');
                    
                    // Limpar TUDO
                    setAnswers({});
                    setTextareaValue('');
                    setPendingSuggestions([]);
                    setAiSuggestions([]);
                    setRecentAutoFills([]);
                    
                    // Forçar localStorage
                    localStorage.removeItem('tria:anamnese:draft');
                    
                    console.log('🔥 TUDO LIMPO!');
                    alert('🔥 TUDO FOI LIMPO! Todos os campos devem estar vazios.');
                  }}
                >
                  🔥 LIMPAR TUDO
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const val = textareaValue.trim();
                    if (!val) return;
                    const next = { ...answers, [currentId]: val };
                    setAnswers(next);
                    if (saveRemote) saveRemote(next).catch(() => {});
                    setPendingSuggestions([]);
                    // Ir para próxima não respondida
                    const nextUnanswered = ALL.find(q => !next[q.id]?.trim());
                    if (nextUnanswered) {
                      setCurrentId(nextUnanswered.id);
                    }
                  }}
                >
                  Salvar e Continuar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
