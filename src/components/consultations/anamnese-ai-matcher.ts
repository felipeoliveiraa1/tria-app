import { ANAMNESE_SECTIONS, AnamneseItem } from './anamnese-questions';

// Sistema expandido de palavras-chave para detectar respostas em conversa natural
const QUESTION_KEYWORDS: Record<string, string[]> = {
  // Identificação - EXPANDIDO
  'nome_completo': [
    'nome', 'chamo', 'sou', 'me chamo', 'meu nome', 'eu sou', 'minha identidade', 'chamam de',
    'minha denominação', 'conhecido como', 'apelidado', 'batizado', 'registro', 'documento',
    'identidade é', 'chama', 'denominado', 'nomeado', 'cognome', 'prenome'
  ],
  'idade': [
    'anos', 'idade', 'tenho', 'nasci', 'nascimento', 'ano', 'velho', 'nova', 'jovem', 'idoso',
    'completo', 'faço', 'aniversário', 'data de nascimento', 'nasceu em', 'idade atual',
    'completei', 'fiz', 'vai fazer', 'quase', 'acabei de fazer', 'tô com', 'estou com'
  ],
  'sexo': [
    'sexo', 'masculino', 'feminino', 'homem', 'mulher', 'gênero', 'macho', 'fêmea',
    'rapaz', 'moça', 'garoto', 'garota', 'menino', 'menina', 'senhor', 'senhora',
    'cara', 'mina', 'brother', 'irmã', 'pai', 'mãe', 'filho', 'filha'
  ],
  'cor_raca': [
    'cor', 'raça', 'etnia', 'branco', 'negro', 'pardo', 'amarelo', 'indígena', 'pele', 'descendência',
    'moreno', 'mulato', 'caboclo', 'mestiço', 'preto', 'caucasiano', 'afrodescendente',
    'oriental', 'asiático', 'índio', 'nativo', 'europeu', 'africano', 'mixed'
  ],
  'nacionalidade_naturalidade': [
    'brasileiro', 'naturalidade', 'nasceu', 'natural de', 'origem', 'país', 'nacionalidade',
    'nasci em', 'sou de', 'venho de', 'terra', 'pátria', 'berço', 'nativo de',
    'cidadania', 'documento', 'passaporte', 'estrangeiro', 'imigrante'
  ],
  'estado_civil': [
    'casado', 'solteiro', 'divorciado', 'viúvo', 'união estável', 'casamento', 'esposa', 'marido', 'separado',
    'namorado', 'namorando', 'compromissado', 'relacionamento', 'parceiro', 'parceira',
    'companheiro', 'companheira', 'noivo', 'noiva', 'ficando', 'pegando', 'junto'
  ],
  'profissao': [
    'trabalho', 'profissão', 'emprego', 'ocupação', 'função', 'cargo', 'serviço', 'ofício', 'atividade', 'aposentado',
    'faço', 'atuo', 'exerço', 'desempenho', 'laboral', 'renda', 'ganha vida', 'sustento',
    'freelancer', 'autônomo', 'clt', 'funcionário', 'servidor', 'empresário', 'estudante'
  ],
  'onde_mora': [
    'moro', 'resido', 'vivo', 'endereço', 'casa', 'apartamento', 'rua', 'bairro', 'cidade', 'local',
    'fico', 'habito', 'localização', 'domicílio', 'residência', 'moradia', 'lar',
    'zona', 'região', 'área', 'cep', 'número', 'avenida', 'travessa'
  ],
  'procedencia': [
    'vim de', 'venho de', 'procedência', 'origem', 'cheguei de', 'saí de',
    'originário', 'natural', 'proveniência', 'migrei', 'mudei', 'transferi'
  ],

  // Queixa Principal - EXPANDIDO
  'qp_queixa': [
    'dor', 'sinto', 'incomoda', 'problema', 'queixa', 'sintoma', 'doendo', 'mal', 'ruim', 'sofrendo', 'machuca',
    'desconforto', 'incômodo', 'chateia', 'perturba', 'afeta', 'prejudica', 'incomoda', 'molesta',
    'arde', 'queima', 'coça', 'formiga', 'lateja', 'pulsa', 'aperta', 'pressiona', 'pesa',
    'estranho', 'diferente', 'anormal', 'esquisito', 'preocupa', 'angustia', 'assusta'
  ],
  'qp_tempo': [
    'há', 'faz', 'desde', 'começou', 'tempo', 'dias', 'semanas', 'meses', 'ontem', 'hoje', 'agora', 'recente',
    'anteontem', 'semana passada', 'mês passado', 'ano passado', 'poucos dias', 'algumas semanas',
    'muito tempo', 'pouco tempo', 'bastante tempo', 'já tem', 'tem uns', 'por volta de',
    'aproximadamente', 'cerca de', 'mais ou menos', 'quase', 'acabou de', 'recentemente'
  ],

  // HMA - EXPANDIDO
  'hma_inicio': [
    'começou', 'iniciou', 'primeiro', 'primeira vez', 'surgiu', 'apareceu', 'nasceu', 'veio',
    'estreou', 'manifestou', 'eclodiu', 'irrompeu', 'despontou', 'emergiu', 'brotou',
    'deu as caras', 'se mostrou', 'se apresentou', 'pegou', 'atacou', 'deu'
  ],
  'hma_instalacao': [
    'súbito', 'gradual', 'devagar', 'rápido', 'como começou', 'de repente', 'aos poucos', 'lento',
    'instantâneo', 'imediato', 'progressivo', 'paulatino', 'vagaroso', 'acelerado',
    'do nada', 'de uma hora pra outra', 'meio que', 'foi aumentando', 'foi crescendo'
  ],
  'hma_localizacao': [
    'onde', 'local', 'localização', 'região', 'lado', 'lugar', 'parte', 'área', 'zona',
    'sítio', 'ponto', 'spot', 'canto', 'pedaço', 'porção', 'setor', 'espaço',
    'direito', 'esquerdo', 'centro', 'meio', 'em cima', 'embaixo', 'dentro', 'fora'
  ],
  'hma_qualidade': [
    'tipo', 'como é', 'sensação', 'queimação', 'pontada', 'latejante', 'pulsante', 'cortante', 'aguda',
    'facada', 'aperto', 'pressão', 'peso', 'cólica', 'fisgada', 'beliscão', 'mordida',
    'choque', 'descarga', 'formigamento', 'dormência', 'ardor', 'calor', 'frio', 'gelo'
  ],
  'hma_freq_intensidade': [
    'frequência', 'intensidade', 'forte', 'fraco', 'sempre', 'às vezes', 'constante', 'intermitente',
    'contínuo', 'persistente', 'esporádico', 'eventual', 'raro', 'comum', 'frequente',
    'leve', 'moderado', 'severo', 'insuportável', 'terrível', 'suave', 'brando', 'pesado'
  ],
  'hma_fatores': [
    'piora', 'melhora', 'alivia', 'aumenta', 'diminui', 'passa', 'fica pior', 'fica melhor',
    'agrava', 'intensifica', 'reduz', 'ameniza', 'acalma', 'some', 'desaparece',
    'volta', 'retorna', 'vai e vem', 'oscila', 'varia', 'muda', 'alterna'
  ],
  'hma_desencadeia': [
    'desencadeia', 'provoca', 'causa', 'gatilho', 'desperta', 'gera', 'faz aparecer',
    'dispara', 'ativa', 'inicia', 'origina', 'produz', 'cria', 'suscita',
    'estimula', 'motiva', 'induz', 'ocasiona', 'determina', 'resulta'
  ],
  'hma_associados': [
    'outros sintomas', 'acompanha', 'junto', 'além disso', 'também', 'mais', 'ainda',
    'associado', 'relacionado', 'conectado', 'ligado', 'vinculado', 'paralelo',
    'simultâneo', 'concomitante', 'adicional', 'extra', 'complementar'
  ],
  'hma_previos': [
    'exames', 'tratamento', 'médico', 'remédio', 'medicamento', 'consulta', 'hospital', 'clínica',
    'doutor', 'doutora', 'especialista', 'posto', 'upa', 'pronto socorro', 'ambulatório',
    'terapia', 'cuidado', 'acompanhamento', 'procedimento', 'intervenção', 'cirurgia'
  ],

  // Antecedentes Pessoais - EXPANDIDO
  'ap_nascimento_desenvolvimento': [
    'nascimento', 'parto', 'desenvolvimento', 'criança', 'bebê', 'infância', 'crescimento',
    'nasceu', 'veio ao mundo', 'chegou', 'cesárea', 'normal', 'prematuro', 'termo'
  ],
  'ap_doencas_importantes': [
    'doenças', 'enfermidades', 'problemas de saúde', 'patologias', 'condições médicas',
    'já tive', 'já teve', 'histórico de', 'sofri de', 'padeci de', 'portador de',
    'diabetes', 'hipertensão', 'pressão alta', 'cardiopatia', 'hepatite', 'tuberculose'
  ],
  'ap_cirurgias_hosp_exames': [
    'cirurgia', 'operação', 'hospital', 'internação', 'internado', 'procedimento',
    'operei', 'operado', 'cortou', 'removeu', 'retirou', 'implantou', 'consertou'
  ],
  'ap_acidentes': [
    'acidente', 'trauma', 'queda', 'batida', 'pancada', 'choque', 'colisão',
    'caí', 'bati', 'machuquei', 'fraturei', 'quebrei', 'torci', 'cortei'
  ],
  'ap_alergias': [
    'alergia', 'alérgico', 'reação', 'intolerância', 'sensibilidade', 'hipersensibilidade',
    'não posso', 'faz mal', 'dá reação', 'incha', 'coça', 'vermelho', 'urticária'
  ],
  'ap_mulher_gineco': [
    'menstruação', 'gravidez', 'parto', 'anticoncepcional', 'ginecológico', 'ciclo',
    'regra', 'período', 'gestação', 'filhos', 'aborto', 'cesariana', 'pílula'
  ],
  'ap_contexto': [
    'trabalho', 'casa', 'alimentação', 'condições', 'ambiente', 'moradia', 'saneamento',
    'água', 'esgoto', 'lixo', 'higiene', 'limpeza', 'exposição', 'contato'
  ],
  'ap_habitos': [
    'fumo', 'cigarro', 'álcool', 'bebida', 'droga', 'vício', 'dependência', 'uso',
    'bebo', 'fumo', 'uso drogas', 'cachimbo', 'charuto', 'maconha', 'cocaína'
  ],
  'ap_sono_humor': [
    'sono', 'dormir', 'humor', 'ansiedade', 'depressão', 'stress', 'nervosismo',
    'insônia', 'sonolência', 'pesadelo', 'ronco', 'apneia', 'tristeza', 'angústia'
  ],
  'ap_medicamentos': [
    'medicamento', 'remédio', 'tomo', 'uso', 'medicação', 'tratamento', 'droga',
    'comprimido', 'pílula', 'injeção', 'pomada', 'xarope', 'gotas', 'prescrição'
  ],

  // Antecedentes Familiares - EXPANDIDO
  'af_saude_familia': [
    'família', 'pais', 'irmãos', 'filhos', 'cônjuge', 'parentes', 'familiares',
    'pai', 'mãe', 'irmão', 'irmã', 'filho', 'filha', 'avô', 'avó', 'tio', 'tia'
  ],
  'af_semelhantes': [
    'família tem', 'parente', 'hereditário', 'genético', 'familiar', 'herança',
    'na família', 'parente tem', 'corre na família', 'vem de família', 'transmitido'
  ],
  'af_hist_repeticao': [
    'histórico familiar', 'diabetes', 'pressão', 'câncer', 'hipertensão', 'cardiopatia',
    'infarto', 'derrame', 'avc', 'tumor', 'neoplasia', 'mental', 'psiquiátrico'
  ],
  'af_obitos': [
    'morreu', 'faleceu', 'morte', 'óbito', 'perdeu', 'partiu', 'foi embora',
    'causa da morte', 'morreu de', 'faleceu por', 'vítima de', 'sucumbiu'
  ],

  // IDA - INTERROGATÓRIO DOS DIVERSOS APARELHOS - EXPANDIDO
  'ida_cabeca': [
    'cabeça', 'dor de cabeça', 'enxaqueca', 'tontura', 'vertigem', 'cefaleia',
    'dor na cabeça', 'dolorido', 'latejante', 'pressão na cabeça', 'peso'
  ],
  'ida_olhos': [
    'olhos', 'visão', 'enxergar', 'vista', 'ver', 'olhar', 'visual', 'ótico',
    'embaçado', 'turvo', 'duplo', 'moscas', 'pontos', 'clarão', 'flash'
  ],
  'ida_ouvidos': [
    'ouvido', 'audição', 'escutar', 'zumbido', 'chiado', 'barulho', 'ruído',
    'surdo', 'ouvir mal', 'tampado', 'cera', 'dor de ouvido', 'otite'
  ],
  'ida_nariz': [
    'nariz', 'respirar', 'sangramento nasal', 'entupido', 'congestionado', 'escorrendo',
    'coriza', 'catarro', 'muco', 'espirrar', 'alergia', 'rinite', 'sinusite'
  ],
  'ida_boca_garganta': [
    'boca', 'garganta', 'engolir', 'rouquidão', 'rouquidão', 'rouco', 'afonia',
    'dor de garganta', 'inflamação', 'ardor', 'seco', 'saliva', 'deglutição'
  ],
  'ida_cardio_pulmonar': [
    'coração', 'peito', 'respiração', 'falta de ar', 'tosse', 'palpitação', 'batimento',
    'dispneia', 'cansaço', 'fadiga', 'chiado no peito', 'catarro', 'escarro'
  ],
  'ida_digestivo': [
    'estômago', 'barriga', 'náusea', 'vômito', 'intestino', 'digestão', 'azia',
    'queimação', 'refluxo', 'gases', 'cólica', 'diarreia', 'prisão de ventre'
  ],
  'ida_urinario_genital': [
    'urina', 'bexiga', 'rim', 'genital', 'urinar', 'xixi', 'fazer xixi',
    'ardor', 'queimação', 'sangue na urina', 'incontinência', 'urgência'
  ],
  'ida_neurologico': [
    'nervoso', 'convulsão', 'tremor', 'fraqueza', 'formigamento', 'dormência',
    'paralisia', 'coordenação', 'equilíbrio', 'memória', 'concentração'
  ],
  'ida_musculoesqueletico': [
    'músculo', 'osso', 'articulação', 'dor nas costas', 'lombar', 'cervical',
    'coluna', 'joelho', 'ombro', 'braço', 'perna', 'rigidez', 'inflamação'
  ],
  'ida_endocrino': [
    'peso', 'calor', 'frio', 'hormônio', 'tireoide', 'diabetes', 'glicose',
    'emagrecer', 'engordar', 'suor', 'transpiração', 'sede', 'fome'
  ],
  'ida_linfatico': [
    'gânglio', 'íngua', 'sangramento', 'hematoma', 'roxo', 'mancha', 'equimose',
    'caroço', 'nódulo', 'inchaço', 'edema', 'linfonodo', 'linfático'
  ]
};

// Padrões específicos para extração de informações - SUPER EXPANDIDO
const EXTRACTION_PATTERNS: Record<string, RegExp[]> = {
  'nome_completo': [
    /(?:meu nome é|me chamo|sou|nome|denominado|conhecido como|chamam de|registro)\s+(.+?)(?:\.|,|;|$)/i,
    /^(.+?)(?:\s+é meu nome|\s+aqui|\s+mesmo|$)/i,
    /(?:^|\s)([A-Z][a-záéíóúâêôãõç]+(?:\s+[A-Z][a-záéíóúâêôãõç]+)+)(?:\s|$)/
  ],
  'idade': [
    /(?:tenho|idade|tô com|estou com|faço|fiz|completei)\s*(\d+)\s*anos?/i,
    /(\d+)\s*anos?\s*(?:de idade|completos)?/i,
    /(?:nasci em|nasceu em)\s*(\d{4})/i,
    /(?:quase|cerca de|por volta de|aproximadamente)\s*(\d+)\s*anos?/i
  ],
  'sexo': [
    /(masculino|feminino|homem|mulher|rapaz|moça|garoto|garota|cara|mina)/i,
    /(?:sou|é)\s*(homem|mulher|masculino|feminino)/i
  ],
  'estado_civil': [
    /(?:sou|estou|tô)\s*(casado|solteiro|divorciado|viúvo|separado|namorando)/i,
    /(casado|solteiro|divorciado|viúvo|separado|namorando|relacionamento|parceiro)/i
  ],
  'profissao': [
    /(?:trabalho|atuo|sou|exerço|faço)\s+(?:como|de|em)?\s*(.+?)(?:\.|,|;|$)/i,
    /(?:profissão|ocupação|emprego|função)\s*[:\-]?\s*(.+?)(?:\.|,|;|$)/i,
    /(?:^|\s)(aposentado|estudante|desempregado|autônomo|empresário)(?:\s|$)/i
  ],
  'onde_mora': [
    /(?:moro|resido|vivo|fico|habito)\s+(?:em|na|no|da|do)?\s*(.+?)(?:\.|,|;|$)/i,
    /(?:endereço|residência|moradia|domicílio)\s*[:\-]?\s*(.+?)(?:\.|,|;|$)/i,
    /(?:rua|avenida|travessa|praça)\s+(.+?)(?:\.|,|;|$)/i
  ],
  'qp_queixa': [
    /(?:sinto|tenho|estou com|tô com|dor)\s+(.+?)(?:\.|,|;|$)/i,
    /(?:problema|incômodo|desconforto)\s+(?:de|em|na|no)?\s*(.+?)(?:\.|,|;|$)/i,
    /(.+?)\s+(?:dói|doendo|machuca|incomoda|perturba)(?:\s|$)/i
  ],
  'qp_tempo': [
    /(?:há|faz|desde|tem)\s+(\d+\s*(?:dias?|semanas?|meses?|anos?))/i,
    /(?:começou|iniciou)\s+(?:há|faz)?\s*(\d+\s*(?:dias?|semanas?|meses?|anos?))/i,
    /(?:ontem|anteontem|hoje|semana passada|mês passado)/i,
    /(?:aproximadamente|cerca de|por volta de|mais ou menos)\s+(\d+\s*(?:dias?|semanas?|meses?|anos?))/i
  ],
  'hma_localizacao': [
    /(?:dor|dói|doendo)\s+(?:na|no|em|da|do)\s*(.+?)(?:\.|,|;|$)/i,
    /(?:lado|região|área|local)\s+(.+?)(?:\.|,|;|$)/i,
    /(direito|esquerdo|centro|meio|em cima|embaixo)/i
  ],
  'hma_qualidade': [
    /(?:dor|sensação)\s+(?:tipo|como)?\s*(facada|aperto|queimação|pontada|latejante|pulsante|cortante|aguda)/i,
    /(facada|aperto|pressão|peso|cólica|fisgada|choque|formigamento|dormência|ardor)/i,
    /(?:é|tipo|como)\s+(.+?)(?:\.|,|;|$)/i
  ],
  'hma_freq_intensidade': [
    /(forte|fraco|leve|moderado|severo|insuportável|terrível|suave|brando|pesado)/i,
    /(?:sempre|às vezes|constante|intermitente|contínuo|persistente|esporádico)/i,
    /(?:intensidade|força)\s+(.+?)(?:\.|,|;|$)/i
  ],
  'ap_medicamentos': [
    /(?:tomo|uso|medicamento|remédio)\s+(.+?)(?:\.|,|;|$)/i,
    /(?:tratamento|medicação)\s+(?:com|de)?\s*(.+?)(?:\.|,|;|$)/i
  ],
  'ap_alergias': [
    /(?:alérgico|alergia)\s+(?:a|de)?\s*(.+?)(?:\.|,|;|$)/i,
    /(?:não posso|faz mal|dá reação)\s+(.+?)(?:\.|,|;|$)/i
  ],
  'af_saude_familia': [
    /(?:pai|mãe|irmão|irmã|família)\s+(?:tem|teve|sofre|sofreu)\s+(.+?)(?:\.|,|;|$)/i,
    /(?:histórico familiar|na família)\s+(?:de|tem)?\s*(.+?)(?:\.|,|;|$)/i
  ]
};

/**
 * Analisa um texto de transcrição e identifica possíveis respostas para TODAS as perguntas da anamnese
 * Sistema inteligente que funciona como conversa natural - não força ordem linear
 */
export function analyzeTranscriptionForAnamnese(
  transcriptionText: string,
  currentQuestionId?: string
): { questionId: string; answer: string; confidence: number; section: string }[] {
  if (!transcriptionText?.trim()) return [];

  console.log('🔍 ANÁLISE IA INICIADA:', { 
    text: transcriptionText.substring(0, 100) + '...', 
    currentQuestion: currentQuestionId 
  });

  const matches: { questionId: string; answer: string; confidence: number; section: string }[] = [];

  // Pré-processar texto para melhor análise
  const cleanText = preprocessText(transcriptionText);
  console.log('📝 Texto processado:', cleanText.substring(0, 100) + '...');

  // Analisar TODAS as perguntas para encontrar possíveis matches
  Object.entries(QUESTION_KEYWORDS).forEach(([questionId, keywords]) => {
    const match = findAnswerForQuestion(cleanText, questionId);
    if (match && match.confidence > 0.2) { // Limiar mais baixo para capturar mais
      // Encontrar a seção da pergunta
      const section = ANAMNESE_SECTIONS.find(s => 
        s.items.some(item => item.id === questionId)
      )?.title || 'Desconhecida';
      
      // Sistema de boost de confiança mais inteligente
      let finalConfidence = match.confidence;
      
      // Boost se for a pergunta atual
      if (questionId === currentQuestionId) {
        finalConfidence += 0.25;
        console.log(`🎯 BOOST para pergunta atual: ${questionId} (${finalConfidence.toFixed(2)})`);
      }
      
      // Boost baseado no tamanho da resposta (respostas mais longas são mais confiáveis)
      if (match.answer.length > 10) {
        finalConfidence += 0.1;
      }
      
      // Boost se a resposta contém informações específicas
      if (containsSpecificInfo(match.answer, questionId)) {
        finalConfidence += 0.15;
        console.log(`📊 BOOST por informação específica: ${questionId}`);
      }
      
      // Limitar confiança máxima
      finalConfidence = Math.min(finalConfidence, 0.95);
      
      console.log(`✅ MATCH encontrado: ${questionId} = "${match.answer}" (confiança: ${finalConfidence.toFixed(2)})`);
      
      matches.push({ 
        questionId, 
        answer: match.answer, 
        confidence: finalConfidence,
        section 
      });
    }
  });

  console.log(`🎉 ANÁLISE CONCLUÍDA: ${matches.length} matches encontrados`);
  
  // Ordenar por confiança (maior primeiro)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Pré-processa o texto para melhor análise
 */
function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Normalizar acentos e caracteres especiais
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Limpar pontuação excessiva mas manter estrutura
    .replace(/[,]{2,}/g, ',')
    .replace(/[.]{2,}/g, '.')
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    // Expandir contrações comuns
    .replace(/\btô\b/g, 'estou')
    .replace(/\btá\b/g, 'está')
    .replace(/\bvc\b/g, 'você')
    .replace(/\bqdo\b/g, 'quando')
    .replace(/\btbm\b/g, 'também')
    .replace(/\bpq\b/g, 'porque');
}

/**
 * Verifica se a resposta contém informações específicas para a pergunta
 */
function containsSpecificInfo(answer: string, questionId: string): boolean {
  const specificPatterns: Record<string, RegExp[]> = {
    'idade': [/\d+/],
    'nome_completo': [/[A-Z][a-z]+/],
    'sexo': [/(masculino|feminino|homem|mulher)/i],
    'qp_tempo': [/\d+\s*(dias?|semanas?|meses?|anos?)/i],
    'profissao': [/(professor|médico|engenheiro|advogado|comerciante|funcionário|aposentado)/i],
    'estado_civil': [/(casado|solteiro|divorciado|viúvo|separado)/i]
  };
  
  const patterns = specificPatterns[questionId];
  if (!patterns) return false;
  
  return patterns.some(pattern => pattern.test(answer));
}

/**
 * Encontra uma resposta específica para uma pergunta - VERSÃO INTELIGENTE
 */
function findAnswerForQuestion(
  text: string,
  questionId: string
): { answer: string; confidence: number } | null {
  const keywords = QUESTION_KEYWORDS[questionId];
  const patterns = EXTRACTION_PATTERNS[questionId];
  
  if (!keywords) return null;

  console.log(`🔍 Analisando pergunta: ${questionId} no texto: "${text.substring(0, 50)}..."`);

  const lowerText = text.toLowerCase();
  let confidence = 0;
  let extractedAnswer = '';
  let matchDetails: string[] = [];

  // 1. Verificar palavras-chave com algoritmo mais inteligente
  const keywordMatches = keywords.filter(keyword => {
    const keywordLower = keyword.toLowerCase();
    const hasMatch = lowerText.includes(keywordLower);
    if (hasMatch) {
      matchDetails.push(`palavra-chave: "${keyword}"`);
    }
    return hasMatch;
  });
  
  if (keywordMatches.length === 0) {
    console.log(`❌ Nenhuma palavra-chave encontrada para ${questionId}`);
    return null;
  }

  // Calcular confiança base por palavras-chave (mais flexível)
  confidence = Math.min(keywordMatches.length / Math.max(keywords.length * 0.3, 1), 0.6);
  console.log(`📊 Confiança base: ${confidence.toFixed(2)} (${keywordMatches.length}/${keywords.length} palavras-chave)`);

  // 2. Tentar extrair resposta usando padrões específicos (PRIORIDADE)
  if (patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedAnswer = match[1].trim();
        confidence += 0.5;
        matchDetails.push(`padrão regex: "${pattern}"`);
        console.log(`✅ PADRÃO ENCONTRADO: "${extractedAnswer}" via regex`);
        break;
      }
    }
  }

  // 3. Se não encontrou padrão específico, extrair contexto inteligente
  if (!extractedAnswer) {
    console.log(`🔍 Tentando extração contextual para ${questionId}...`);
    
    // Dividir em sentenças mais inteligentemente
    const sentences = text.split(/[.!?;]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase().trim();
      
      // Verificar se a sentença contém palavras-chave
      const relevantKeywords = keywords.filter(keyword => 
        lowerSentence.includes(keyword.toLowerCase())
      );
      
      if (relevantKeywords.length > 0 && sentence.trim().length > 2) {
        // Extrair informação mais específica da sentença
        const contextAnswer = extractContextualAnswer(sentence.trim(), questionId, relevantKeywords);
        if (contextAnswer) {
          extractedAnswer = contextAnswer;
          confidence += 0.3;
          matchDetails.push(`contexto: sentença com ${relevantKeywords.length} palavras-chave`);
          console.log(`📝 CONTEXTO EXTRAÍDO: "${extractedAnswer}"`);
          break;
        }
      }
    }
  }

  // 4. Se ainda não encontrou, tentar extração em palavras próximas
  if (!extractedAnswer && keywordMatches.length > 0) {
    console.log(`🎯 Tentando extração por proximidade para ${questionId}...`);
    
    for (const keyword of keywordMatches) {
      const proximityAnswer = extractByProximity(text, keyword, questionId);
      if (proximityAnswer) {
        extractedAnswer = proximityAnswer;
        confidence += 0.25;
        matchDetails.push(`proximidade: palavra "${keyword}"`);
        console.log(`📍 PROXIMIDADE EXTRAÍDA: "${extractedAnswer}"`);
        break;
      }
    }
  }

  // 5. Limpar e validar a resposta extraída
  if (extractedAnswer) {
    const cleanedAnswer = cleanExtractedAnswer(extractedAnswer, questionId);
    if (cleanedAnswer.length < 1) {
      console.log(`❌ Resposta muito curta após limpeza: "${cleanedAnswer}"`);
      return null;
    }
    extractedAnswer = cleanedAnswer;
  }

  const finalResult = extractedAnswer && confidence > 0.2 
    ? { answer: extractedAnswer, confidence: Math.min(confidence, 1.0) }
    : null;

  if (finalResult) {
    console.log(`✅ RESULTADO FINAL para ${questionId}: "${finalResult.answer}" (${finalResult.confidence.toFixed(2)}) - ${matchDetails.join(', ')}`);
  } else {
    console.log(`❌ Nenhum resultado válido para ${questionId}`);
  }

  return finalResult;
}

/**
 * Extrai resposta contextual de uma sentença
 */
function extractContextualAnswer(sentence: string, questionId: string, keywords: string[]): string | null {
  // Remover palavras-chave da resposta para pegar só o conteúdo relevante
  let answer = sentence;
  
  // Para certas perguntas, extrair apenas a parte relevante
  if (questionId === 'nome_completo') {
    // Tentar extrair nomes próprios
    const nameMatch = sentence.match(/(?:^|\s)([A-Z][a-záéíóúâêôãõç]+(?:\s+[A-Z][a-záéíóúâêôãõç]+)+)(?:\s|$)/);
    if (nameMatch) return nameMatch[1];
  }
  
  if (questionId === 'idade') {
    // Extrair apenas números + anos
    const ageMatch = sentence.match(/(\d+)\s*anos?/i);
    if (ageMatch) return ageMatch[1] + ' anos';
  }
  
  // Para outras perguntas, remover palavras-chave e prefixos comuns
  for (const keyword of keywords) {
    answer = answer.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
  }
  
  // Remover prefixos comuns
  answer = answer
    .replace(/^(é|sou|tenho|estou|tô|meu|minha|o|a|os|as)\s+/i, '')
    .replace(/^(que|como|onde|quando)\s+/i, '')
    .trim();
  
  return answer.length > 2 ? answer : null;
}

/**
 * Extrai resposta por proximidade de palavras-chave
 */
function extractByProximity(text: string, keyword: string, questionId: string): string | null {
  const words = text.split(/\s+/);
  const keywordIndex = words.findIndex(word => 
    word.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (keywordIndex === -1) return null;
  
  // Extrair palavras próximas (contexto de 5 palavras para cada lado)
  const start = Math.max(0, keywordIndex - 3);
  const end = Math.min(words.length, keywordIndex + 4);
  const contextWords = words.slice(start, end);
  
  return contextWords.join(' ').trim();
}

/**
 * Limpa e formata a resposta extraída - VERSÃO INTELIGENTE
 */
function cleanExtractedAnswer(answer: string, questionId?: string): string {
  let cleaned = answer.trim();
  
  // Remover prefixos comuns baseados no tipo de pergunta
  const commonPrefixes = [
    /^(meu nome é|me chamo|sou|tenho|idade|estou com|tô com)\s*/i,
    /^(eu|o|a|os|as|um|uma|uns|umas)\s*/i,
    /^(que|como|onde|quando|por que|porque)\s*/i,
    /^(é|foi|será|está|estou|tou)\s*/i
  ];
  
  for (const prefix of commonPrefixes) {
    cleaned = cleaned.replace(prefix, '').trim();
  }
  
  // Limpeza específica por tipo de pergunta
  if (questionId === 'idade') {
    // Manter apenas números e "anos"
    const ageMatch = cleaned.match(/(\d+)\s*(?:anos?)?/i);
    if (ageMatch) {
      return ageMatch[1] + (ageMatch[0].includes('ano') ? ' anos' : ' anos');
    }
  }
  
  if (questionId === 'nome_completo') {
    // Capitalizar nomes próprios
    cleaned = cleaned.replace(/\b\w+/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }
  
  // Limpeza geral
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Normalizar espaços
    .replace(/[,.\-;]+$/, '') // Remover pontuação no final
    .replace(/^[,.\-;]+/, '') // Remover pontuação no início
    .trim();
  
  return cleaned;
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
