import { ANAMNESE_SECTIONS, AnamneseItem } from './anamnese-questions';

// Palavras-chave expandidas para detectar respostas em conversa natural
const QUESTION_KEYWORDS: Record<string, string[]> = {
  // Identificação
  'nome_completo': ['nome', 'chamo', 'sou', 'me chamo', 'meu nome', 'eu sou', 'minha identidade', 'chamam de'],
  'idade': ['anos', 'idade', 'tenho', 'nasci', 'nascimento', 'ano', 'velho', 'nova', 'jovem', 'idoso'],
  'sexo': ['sexo', 'masculino', 'feminino', 'homem', 'mulher', 'gênero', 'macho', 'fêmea'],
  'cor_raca': ['cor', 'raça', 'etnia', 'branco', 'negro', 'pardo', 'amarelo', 'indígena', 'pele', 'descendência'],
  'nacionalidade_naturalidade': ['brasileiro', 'naturalidade', 'nasceu', 'natural de', 'origem', 'país', 'nacionalidade'],
  'estado_civil': ['casado', 'solteiro', 'divorciado', 'viúvo', 'união estável', 'casamento', 'esposa', 'marido', 'separado'],
  'profissao': ['trabalho', 'profissão', 'emprego', 'ocupação', 'função', 'cargo', 'serviço', 'ofício', 'atividade', 'aposentado'],
  'onde_mora': ['moro', 'resido', 'vivo', 'endereço', 'casa', 'apartamento', 'rua', 'bairro', 'cidade', 'local'],
  'procedencia': ['vim de', 'venho de', 'procedência', 'origem', 'cheguei de', 'saí de'],

  // Queixa Principal
  'qp_queixa': ['dor', 'sinto', 'incomoda', 'problema', 'queixa', 'sintoma', 'doendo', 'mal', 'ruim', 'sofrendo', 'machuca'],
  'qp_tempo': ['há', 'faz', 'desde', 'começou', 'tempo', 'dias', 'semanas', 'meses', 'ontem', 'hoje', 'agora', 'recente'],

  // HMA  
  'hma_inicio': ['começou', 'iniciou', 'primeiro', 'primeira vez', 'surgiu', 'apareceu', 'nasceu', 'veio'],
  'hma_instalacao': ['súbito', 'gradual', 'devagar', 'rápido', 'como começou', 'de repente', 'aos poucos', 'lento'],
  'hma_localizacao': ['onde', 'local', 'localização', 'região', 'lado', 'lugar', 'parte', 'área', 'zona'],
  'hma_qualidade': ['tipo', 'como é', 'sensação', 'queimação', 'pontada', 'latejante', 'pulsante', 'cortante', 'aguda'],
  'hma_freq_intensidade': ['frequência', 'intensidade', 'forte', 'fraco', 'sempre', 'às vezes', 'constante', 'intermitente'],
  'hma_fatores': ['piora', 'melhora', 'alivia', 'aumenta', 'diminui', 'passa', 'fica pior', 'fica melhor'],
  'hma_desencadeia': ['desencadeia', 'provoca', 'causa', 'gatilho', 'desperta', 'gera', 'faz aparecer'],
  'hma_associados': ['outros sintomas', 'acompanha', 'junto', 'além disso', 'também', 'mais', 'ainda'],
  'hma_previos': ['exames', 'tratamento', 'médico', 'remédio', 'medicamento', 'consulta', 'hospital', 'clínica'],

  // Antecedentes Pessoais
  'ap_nascimento_desenvolvimento': ['nascimento', 'parto', 'desenvolvimento', 'criança'],
  'ap_doencas_importantes': ['doenças', 'enfermidades', 'problemas de saúde'],
  'ap_cirurgias_hosp_exames': ['cirurgia', 'operação', 'hospital', 'internação'],
  'ap_acidentes': ['acidente', 'trauma', 'queda', 'batida'],
  'ap_alergias': ['alergia', 'alérgico', 'reação'],
  'ap_mulher_gineco': ['menstruação', 'gravidez', 'parto', 'anticoncepcional'],
  'ap_contexto': ['trabalho', 'casa', 'alimentação', 'condições'],
  'ap_habitos': ['fumo', 'cigarro', 'álcool', 'bebida', 'droga'],
  'ap_sono_humor': ['sono', 'dormir', 'humor', 'ansiedade', 'depressão'],
  'ap_medicamentos': ['medicamento', 'remédio', 'tomo', 'uso'],

  // Antecedentes Familiares
  'af_saude_familia': ['família', 'pais', 'irmãos', 'filhos', 'cônjuge'],
  'af_semelhantes': ['família tem', 'parente', 'hereditário'],
  'af_hist_repeticao': ['histórico familiar', 'diabetes', 'pressão', 'câncer'],
  'af_obitos': ['morreu', 'faleceu', 'morte', 'óbito'],

  // IDA
  'ida_cabeca': ['cabeça', 'dor de cabeça', 'enxaqueca', 'tontura'],
  'ida_olhos': ['olhos', 'visão', 'enxergar', 'vista'],
  'ida_ouvidos': ['ouvido', 'audição', 'escutar', 'zumbido'],
  'ida_nariz': ['nariz', 'respirar', 'sangramento nasal'],
  'ida_boca_garganta': ['boca', 'garganta', 'engolir', 'rouquidão'],
  'ida_cardio_pulmonar': ['coração', 'peito', 'respiração', 'falta de ar', 'tosse'],
  'ida_digestivo': ['estômago', 'barriga', 'náusea', 'vômito', 'intestino'],
  'ida_urinario_genital': ['urina', 'bexiga', 'rim', 'genital'],
  'ida_neurologico': ['nervoso', 'convulsão', 'tremor', 'fraqueza'],
  'ida_musculoesqueletico': ['músculo', 'osso', 'articulação', 'dor nas costas'],
  'ida_endocrino': ['peso', 'calor', 'frio', 'hormônio'],
  'ida_linfatico': ['gânglio', 'íngua', 'sangramento', 'hematoma']
};

// Padrões específicos para extração de informações
const EXTRACTION_PATTERNS: Record<string, RegExp[]> = {
  'nome_completo': [
    /(?:meu nome é|me chamo|sou|nome)\s+(.+?)(?:\.|,|$)/i,
    /^(.+?)(?:\s+é meu nome|\s+aqui|$)/i
  ],
  'idade': [
    /(?:tenho|idade|anos)\s*(\d+)\s*anos?/i,
    /(\d+)\s*anos?/i
  ],
  'sexo': [
    /(masculino|feminino|homem|mulher)/i
  ],
  'qp_tempo': [
    /há\s+(\d+\s*(?:dias?|semanas?|meses?|anos?))/i,
    /faz\s+(\d+\s*(?:dias?|semanas?|meses?|anos?))/i,
    /desde\s+(.+?)(?:\.|,|$)/i
  ]
};

/**
 * Analisa um texto de transcrição e identifica possíveis respostas para TODAS as perguntas da anamnese
 * Funciona como conversa natural - não força ordem linear
 */
export function analyzeTranscriptionForAnamnese(
  transcriptionText: string,
  currentQuestionId?: string
): { questionId: string; answer: string; confidence: number; section: string }[] {
  if (!transcriptionText?.trim()) return [];

  const matches: { questionId: string; answer: string; confidence: number; section: string }[] = [];

  // Analisar TODAS as perguntas para encontrar possíveis matches
  Object.entries(QUESTION_KEYWORDS).forEach(([questionId, keywords]) => {
    const match = findAnswerForQuestion(transcriptionText, questionId);
    if (match && match.confidence > 0.3) {
      // Encontrar a seção da pergunta
      const section = ANAMNESE_SECTIONS.find(s => 
        s.items.some(item => item.id === questionId)
      )?.title || 'Desconhecida';
      
      // Dar boost se for a pergunta atual
      let finalConfidence = match.confidence;
      if (questionId === currentQuestionId) {
        finalConfidence += 0.2;
      }
      
      matches.push({ 
        questionId, 
        answer: match.answer, 
        confidence: finalConfidence,
        section 
      });
    }
  });

  // Ordenar por confiança (maior primeiro)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Encontra uma resposta específica para uma pergunta
 */
function findAnswerForQuestion(
  text: string,
  questionId: string
): { answer: string; confidence: number } | null {
  const keywords = QUESTION_KEYWORDS[questionId];
  const patterns = EXTRACTION_PATTERNS[questionId];
  
  if (!keywords) return null;

  const lowerText = text.toLowerCase();
  let confidence = 0;
  let extractedAnswer = '';

  // Verificar se há palavras-chave relevantes
  const keywordMatches = keywords.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  if (keywordMatches.length === 0) return null;

  confidence = Math.min(keywordMatches.length / keywords.length, 0.8);

  // Tentar extrair resposta usando padrões específicos
  if (patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedAnswer = match[1].trim();
        confidence += 0.4;
        break;
      }
    }
  }

  // Se não encontrou padrão específico, tentar extrair contexto
  if (!extractedAnswer) {
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const hasKeyword = keywords.some(keyword => 
        lowerSentence.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword && sentence.trim().length > 0) {
        extractedAnswer = sentence.trim();
        confidence += 0.2;
        break;
      }
    }
  }

  // Limpar e validar a resposta extraída
  if (extractedAnswer) {
    extractedAnswer = cleanExtractedAnswer(extractedAnswer);
    if (extractedAnswer.length < 2) return null;
  }

  return extractedAnswer && confidence > 0.3 
    ? { answer: extractedAnswer, confidence: Math.min(confidence, 1.0) }
    : null;
}

/**
 * Limpa e formata a resposta extraída
 */
function cleanExtractedAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/^(meu nome é|me chamo|sou|tenho|idade)\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,.]$/, '')
    .trim();
}

/**
 * Obtém a pergunta por ID
 */
export function getQuestionById(questionId: string): AnamneseItem | null {
  const allQuestions = ANAMNESE_SECTIONS.flatMap(section => section.items);
  return allQuestions.find(q => q.id === questionId) || null;
}

/**
 * Obtém sugestões de preenchimento baseadas na transcrição atual
 */
export function getSuggestionsForCurrentQuestion(
  transcriptionText: string,
  currentQuestionId: string
): string[] {
  if (!transcriptionText?.trim() || !currentQuestionId) return [];

  const match = findAnswerForQuestion(transcriptionText, currentQuestionId);
  if (!match) return [];

  // Gerar múltiplas sugestões baseadas no contexto
  const suggestions: string[] = [match.answer];

  // Adicionar variações para certas perguntas
  if (currentQuestionId === 'nome_completo') {
    const names = match.answer.split(' ');
    if (names.length > 1) {
      suggestions.push(names.slice(0, 2).join(' ')); // Primeiro e segundo nome
    }
  }

  return suggestions.filter((s, i, arr) => arr.indexOf(s) === i); // Remove duplicatas
}
