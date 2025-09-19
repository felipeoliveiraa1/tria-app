import { useCallback, useRef, useState, useEffect } from 'react'
import { Room, RoomEvent, Track, LocalAudioTrack } from 'livekit-client'
import { useRecordingStore } from '../store/recording-store'
import { createVADNode, VADMessage } from '@/audio/vad-node'
import { SpeechSegmenter, SpeechSegment } from '@/audio/speech-segmenter'
import { makeMultipart } from '@/audio/audio-utils'

interface DualLiveKitSTTConfig {
  consultationId: string
  livekitUrl?: string
}

type DeviceOption = { deviceId: string; label: string }

type MicrophoneConfig = {
  deviceId: string
  speaker: 'doctor' | 'patient'
  label: string
}

export function useDualLivekitSTT(config: DualLiveKitSTTConfig) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [participants, setParticipants] = useState<string[]>([])
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [doctorMic, setDoctorMic] = useState<string>('')
  const [patientMic, setPatientMic] = useState<string>('')
  
  const roomRef = useRef<Room | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const doctorRecorderRef = useRef<MediaRecorder | null>(null)
  const patientRecorderRef = useRef<MediaRecorder | null>(null)
  const doctorChunksRef = useRef<Blob[]>([])
  const patientChunksRef = useRef<Blob[]>([])
  const processingRef = useRef<{ doctor: boolean; patient: boolean }>({ doctor: false, patient: false })
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const doctorIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const patientIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const doctorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const patientTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isReconnectingRef = useRef(false)
  const doctorStreamRef = useRef<MediaStream | null>(null)
  const patientStreamRef = useRef<MediaStream | null>(null)
  const lastTranscriptionRef = useRef<{doctor: string | undefined, patient: string | undefined}>({doctor: undefined, patient: undefined})
  const processedTranscriptionsRef = useRef<Set<string>>(new Set())
  
  // VAD e Speech Segmentation
  const doctorVADRef = useRef<any>(null)
  const patientVADRef = useRef<any>(null)
  const doctorSegmenterRef = useRef<SpeechSegmenter | null>(null)
  const patientSegmenterRef = useRef<SpeechSegmenter | null>(null)
  const doctorAudioContextRef = useRef<AudioContext | null>(null)
  const patientAudioContextRef = useRef<AudioContext | null>(null)
  
  // Floor control
  const doctorActiveRef = useRef(false)
  const patientActiveRef = useRef(false)
  const doctorFloorHoldRef = useRef(0)
  const patientFloorHoldRef = useRef(0)
  
  const { 
    addFinalSegment, 
    setRealtimeConnected,
    setConsultationId 
  } = useRecordingStore()

  // Detectar microfone ativo baseado no áudio
  const detectActiveMicrophone = useCallback((audioData: Float32Array, speaker: 'doctor' | 'patient') => {
    // Calcular volume médio
    const volume = audioData.reduce((sum, sample) => sum + Math.abs(sample), 0) / audioData.length
    
    // Se o volume for alto o suficiente, considerar ativo
    const isActive = volume > 0.01 // Threshold ajustável
    
    if (isActive) {
      console.log(`🎤 Microfone ${speaker} ativo - Volume: ${volume.toFixed(4)}`)
    }
    
    return isActive
  }, [])

  // Função específica para bloquear conteúdo de vídeo/legendas
  const isVideoContent = useCallback((text: string) => {
    const videoPatterns = [
      /amara/i,
      /comunidade/i,
      /legendas/i,
      /\.org/i,
      /subtitle/i,
      /caption/i,
      /transcrição automática/i,
      /legendas automáticas/i,
      /legendas geradas/i,
      /legendas pela/i,
      /legendas pela comunidade/i,
      /amara\.org/i,
    ]
    
    return videoPatterns.some(pattern => pattern.test(text))
  }, [])

  // Verificar se o texto tem contexto médico real
  const hasMedicalContext = useCallback((text: string) => {
    // Primeiro, verificar se contém conteúdo de vídeo/legendas
    if (isVideoContent(text)) {
      return false // Bloquear completamente
    }
    
    const medicalKeywords = [
      // Sintomas comuns
      'dor', 'dores', 'dolorido', 'dolorida',
      'febre', 'temperatura', 'calafrio',
      'tosse', 'tossindo', 'tossir',
      'nariz', 'coriza', 'espirro',
      'garganta', 'rouquidão', 'rouco',
      'cabeça', 'enxaqueca', 'tontura',
      'estômago', 'barriga', 'abdômen',
      'náusea', 'vômito', 'diarreia',
      'cansaço', 'fadiga', 'fraqueza',
      'falta de ar', 'respiração', 'respirar',
      'peito', 'coração', 'palpitação',
      'pressão', 'hipertensão', 'hipotensão',
      'diabetes', 'glicemia', 'açúcar',
      'colesterol', 'triglicerídeos',
      'peso', 'emagrecer', 'engordar',
      'altura', 'crescimento',
      'sangue', 'hemorragia', 'sangramento',
      'urina', 'xixi', 'bexiga',
      'fezes', 'cocô', 'intestino',
      'pele', 'mancha', 'verruga', 'espinha',
      'olho', 'visão', 'enxergar',
      'ouvido', 'audição', 'escutar',
      'dente', 'gengiva', 'boca',
      'músculo', 'osso', 'articulação',
      'joelho', 'tornozelo', 'ombro',
      'pescoço', 'costas', 'coluna',
      'braço', 'perna', 'mão', 'pé',
      
      // Medicamentos
      'remédio', 'medicamento', 'comprimido',
      'cápsula', 'xarope', 'gotas',
      'pomada', 'creme', 'gel',
      'injeção', 'seringa', 'agulha',
      'antibiótico', 'anti-inflamatório',
      'analgésico', 'antitérmico',
      'vitamina', 'suplemento',
      
      // Exames
      'exame', 'teste', 'análise',
      'sangue', 'urina', 'fezes',
      'raio x', 'ultrassom', 'tomografia',
      'ressonância', 'ecocardiograma',
      'eletrocardiograma', 'ecg',
      'endoscopia', 'colonoscopia',
      'mamografia', 'papanicolau',
      'biópsia', 'citologia',
      
      // Especialidades médicas
      'clínico', 'pediatra', 'ginecologista',
      'cardiologista', 'neurologista',
      'ortopedista', 'dermatologista',
      'oftalmologista', 'otorrino',
      'psiquiatra', 'psicólogo',
      'fisioterapeuta', 'nutricionista',
      
      // Condições médicas
      'gripe', 'resfriado', 'sinusite',
      'bronquite', 'pneumonia', 'asma',
      'hipertensão', 'diabetes', 'obesidade',
      'ansiedade', 'depressão', 'estresse',
      'insônia', 'apneia', 'ronco',
      'alergia', 'asma', 'rinite',
      'gastrite', 'úlcera', 'refluxo',
      'hepatite', 'cirrose', 'pedra',
      'cálculo', 'cistite', 'infecção',
      'inflamação', 'tumor', 'câncer',
      'metástase', 'quimioterapia',
      'radioterapia', 'cirurgia',
      
      // Partes do corpo
      'cabeça', 'pescoço', 'ombro',
      'braço', 'cotovelo', 'punho',
      'mão', 'dedo', 'peito',
      'costas', 'coluna', 'lombar',
      'quadril', 'perna', 'joelho',
      'tornozelo', 'pé', 'calcanhar',
      'olho', 'orelha', 'nariz',
      'boca', 'dente', 'língua',
      'garganta', 'pescoço', 'tireoide',
      'pulmão', 'coração', 'fígado',
      'rim', 'bexiga', 'intestino',
      'estômago', 'pâncreas', 'baço',
      'útero', 'ovário', 'próstata',
      'testículo', 'pênis', 'vagina',
      'mama', 'pele', 'unha', 'cabelo',
      
      // Palavras de contexto médico geral
      'paciente', 'médico', 'doutor', 'doutora',
      'consulta', 'atendimento', 'tratamento',
      'diagnóstico', 'sintoma', 'sintomas',
      'histórico', 'clínico', 'anamnese',
      'idade', 'anos', 'meses', 'dias',
      'nome', 'endereço', 'telefone',
      'alergia', 'alergias', 'medicamento',
      'medicamentos', 'dosagem', 'posologia',
      'horário', 'manhã', 'tarde', 'noite',
      'comer', 'beber', 'dormir', 'acordar',
      'sentir', 'sentindo', 'melhor', 'pior',
      'dor', 'dores', 'incômodo', 'desconforto',
      'faz', 'fazer', 'tomar', 'usar',
      'aplicar', 'colocar', 'retirar',
      'voltar', 'retorno', 'próxima',
      'agendar', 'marcar', 'cancelar',
      'receita', 'atestado', 'exame',
      'resultado', 'laudo', 'prontuário'
    ]
    
    const normalizedText = text.toLowerCase()
    
    // Verificar se contém pelo menos uma palavra-chave médica
    const hasKeyword = medicalKeywords.some(keyword => 
      normalizedText.includes(keyword)
    )
    
    // Verificar se tem pelo menos 5 caracteres (texto substancial)
    const hasSubstance = normalizedText.length >= 5
    
    // Verificar se não é apenas pontuação ou espaços
    const hasContent = /[a-zA-Z]/.test(normalizedText)
    
    // Se tem palavra-chave médica, aceita
    if (hasKeyword && hasSubstance && hasContent) {
      return true
    }
    
    // Se não tem palavra-chave médica, mas tem pelo menos 15 caracteres e parece ser uma frase real, aceita
    if (hasSubstance && hasContent && normalizedText.length >= 15 && 
        (normalizedText.includes(' ') || normalizedText.includes(',') || normalizedText.includes('.'))) {
      return true
    }
    
    return false
  }, [])

  // Filtrar transcrições genéricas e de baixa qualidade
  const isGenericTranscription = useCallback((text: string) => {
    // Filtro agressivo para legendas e conteúdo de vídeo
    if (isVideoContent(text)) {
      return true
    }
    const genericPatterns = [
      // Padrões genéricos de consulta médica
      /o paciente está falando com o médico/i,
      /sobre seus sintomas e histórico médico/i,
      /consulta médica/i,
      /sintomas e histórico/i,
      /médico sobre seus/i,
      /paciente está falando/i,
      /histórico médico/i,
      /sintomas e histórico médico/i,
      
      // Padrões genéricos comuns que não fazem sentido
      /como foi/i,
      /agora eu vou na horticultura/i,
      /cade ação/i,
      /é isso aí/i,
      /muito obrigado/i,
      /obrigado/i,
      /obrigada/i,
      /obrigado\./i,
      /obrigada\./i,
      /para a verdade/i,
      /a verdade é que você/i,
      /está com um leve delayzinho/i,
      /acho que esse país tem sempre sido mais desagradável/i,
      /o paciente testificado só teve uma musclesose/i,
      /tiroside давіnho/i,
      /questões exigentes do oxigênio/i,
      /alguma sensação sobre o oxigênio/i,
      /harry de outro vez/i,
      
      // Padrões de legendas e transcrições automáticas
      /legendas pela comunidade/i,
      /amara\.org/i,
      /legendas automáticas/i,
      /transcrição automática/i,
      /legendas geradas automaticamente/i,
      /subtitle/i,
      /caption/i,
      /legendas/i,
      /comunidade/i,
      /amara/i,
      /\.org/i,
      /a gente vai editar na informação/i,
      /pra gente enxugar melhor/i,
      /como você está/i,
      /bom dia/i,
      /boa tarde/i,
      /boa noite/i,
      /tudo bem/i,
      /como vai/i,
      /está tudo certo/i,
      /vou prescrever/i,
      /vou receitar/i,
      /tome este medicamento/i,
      /volte em/i,
      /agende uma consulta/i,
      /exame de sangue/i,
      /raio x/i,
      /ultrassom/i,
      /tomografia/i,
      /ressonância magnética/i,
      /biópsia/i,
      /cirurgia/i,
      /internação/i,
      /alta médica/i,
      /atestado médico/i,
      /receita médica/i,
      /laudo médico/i,
      /prontuário médico/i,
      /histórico clínico/i,
      /anamnese/i,
      /diagnóstico/i,
      /tratamento/i,
      /medicamento/i,
      /dosagem/i,
      /posologia/i,
      /efeitos colaterais/i,
      /contraindicações/i,
      /alergia/i,
      /reação alérgica/i,
      /pressão arterial/i,
      /frequência cardíaca/i,
      /temperatura/i,
      /peso/i,
      /altura/i,
      /imc/i,
      /índice de massa corporal/i,
      /glicemia/i,
      /colesterol/i,
      /triglicerídeos/i,
      /hemoglobina/i,
      /leucócitos/i,
      /plaquetas/i,
      /urina/i,
      /fezes/i,
      /sangue/i,
      /muco/i,
      /secreção/i,
      /inflamação/i,
      /infecção/i,
      /bactéria/i,
      /vírus/i,
      /fungo/i,
      /parasita/i,
      /antibiótico/i,
      /anti-inflamatório/i,
      /analgésico/i,
      /antitérmico/i,
      /antialérgico/i,
      /antidepressivo/i,
      /ansiolítico/i,
      /sonífero/i,
      /vitamina/i,
      /suplemento/i,
      /fitoterápico/i,
      /homeopatia/i,
      /acupuntura/i,
      /fisioterapia/i,
      /terapia ocupacional/i,
      /psicologia/i,
      /psiquiatria/i,
      /cardiologia/i,
      /neurologia/i,
      /ortopedia/i,
      /dermatologia/i,
      /ginecologia/i,
      /urologia/i,
      /pediatria/i,
      /geriatria/i,
      /oncologia/i,
      /hematologia/i,
      /endocrinologia/i,
      /gastroenterologia/i,
      /pneumologia/i,
      /reumatologia/i,
      /oftalmologia/i,
      /otorrinolaringologia/i,
      /cirurgia geral/i,
      /cirurgia plástica/i,
      /cirurgia cardíaca/i,
      /cirurgia neurológica/i,
      /cirurgia ortopédica/i,
      /cirurgia vascular/i,
      /cirurgia digestiva/i,
      /cirurgia urológica/i,
      /cirurgia ginecológica/i,
      /cirurgia pediátrica/i,
      /cirurgia torácica/i,
      /cirurgia de cabeça e pescoço/i,
      /cirurgia de mão/i,
      /cirurgia de coluna/i,
      /cirurgia de joelho/i,
      /cirurgia de quadril/i,
      /cirurgia de ombro/i,
      /cirurgia de tornozelo/i,
      /cirurgia de pé/i,
      /cirurgia de retina/i,
      /cirurgia de catarata/i,
      /cirurgia de glaucoma/i,
      /cirurgia de estrabismo/i,
      /cirurgia de pálpebra/i,
      /cirurgia de nariz/i,
      /cirurgia de ouvido/i,
      /cirurgia de garganta/i,
      /cirurgia de tireoide/i,
      /cirurgia de paratireoide/i,
      /cirurgia de adrenal/i,
      /cirurgia de pâncreas/i,
      /cirurgia de fígado/i,
      /cirurgia de vesícula/i,
      /cirurgia de baço/i,
      /cirurgia de rim/i,
      /cirurgia de bexiga/i,
      /cirurgia de próstata/i,
      /cirurgia de útero/i,
      /cirurgia de ovário/i,
      /cirurgia de mama/i,
      /cirurgia de pulmão/i,
      /cirurgia de coração/i,
      /cirurgia de aorta/i,
      /cirurgia de artéria/i,
      /cirurgia de veia/i,
      /cirurgia de nervo/i,
      /cirurgia de tendão/i,
      /cirurgia de ligamento/i,
      /cirurgia de menisco/i,
      /cirurgia de cartilagem/i,
      /cirurgia de osso/i,
      /cirurgia de fratura/i,
      /cirurgia de luxação/i,
      /cirurgia de entorse/i,
      /cirurgia de contusão/i,
      /cirurgia de hematoma/i,
      /cirurgia de abscesso/i,
      /cirurgia de cisto/i,
      /cirurgia de nódulo/i,
      /cirurgia de tumor/i,
      /cirurgia de câncer/i,
      /cirurgia de metástase/i,
      /cirurgia de recidiva/i,
      /cirurgia de remissão/i,
      /cirurgia de cura/i,
      /cirurgia de sobrevida/i,
      /cirurgia de qualidade de vida/i,
      /cirurgia de reabilitação/i,
      /cirurgia de recuperação/i,
      /cirurgia de cicatrização/i,
      /cirurgia de infecção/i,
      /cirurgia de complicação/i,
      /cirurgia de risco/i,
      /cirurgia de benefício/i,
      /cirurgia de indicação/i,
      /cirurgia de contraindicação/i,
      /cirurgia de alternativa/i,
      /cirurgia de opção/i,
      /cirurgia de escolha/i,
      /cirurgia de decisão/i,
      /cirurgia de consentimento/i,
      /cirurgia de autorização/i,
      /cirurgia de liberação/i,
      /cirurgia de alta/i,
      /cirurgia de internação/i,
      /cirurgia de pré-operatório/i,
      /cirurgia de pós-operatório/i,
      /cirurgia de anestesia/i,
      /cirurgia de sedação/i,
      /cirurgia de monitoramento/i,
      /cirurgia de acompanhamento/i,
      /cirurgia de seguimento/i,
      /cirurgia de retorno/i,
      /cirurgia de consulta/i,
      /cirurgia de exame/i,
      /cirurgia de teste/i,
      /cirurgia de avaliação/i,
      /cirurgia de diagnóstico/i,
      /cirurgia de tratamento/i,
      /cirurgia de terapia/i,
      /cirurgia de medicamento/i,
      /cirurgia de dosagem/i,
      /cirurgia de posologia/i,
      /cirurgia de efeitos colaterais/i,
      /cirurgia de contraindicações/i,
      /cirurgia de alergia/i,
      /cirurgia de reação alérgica/i,
      /cirurgia de pressão arterial/i,
      /cirurgia de frequência cardíaca/i,
      /cirurgia de temperatura/i,
      /cirurgia de peso/i,
      /cirurgia de altura/i,
      /cirurgia de imc/i,
      /cirurgia de índice de massa corporal/i,
      /cirurgia de glicemia/i,
      /cirurgia de colesterol/i,
      /cirurgia de triglicerídeos/i,
      /cirurgia de hemoglobina/i,
      /cirurgia de leucócitos/i,
      /cirurgia de plaquetas/i,
      /cirurgia de urina/i,
      /cirurgia de fezes/i,
      /cirurgia de sangue/i,
      /cirurgia de muco/i,
      /cirurgia de secreção/i,
      /cirurgia de inflamação/i,
      /cirurgia de infecção/i,
      /cirurgia de bactéria/i,
      /cirurgia de vírus/i,
      /cirurgia de fungo/i,
      /cirurgia de parasita/i,
      /cirurgia de antibiótico/i,
      /cirurgia de anti-inflamatório/i,
      /cirurgia de analgésico/i,
      /cirurgia de antitérmico/i,
      /cirurgia de antialérgico/i,
      /cirurgia de antidepressivo/i,
      /cirurgia de ansiolítico/i,
      /cirurgia de sonífero/i,
      /cirurgia de vitamina/i,
      /cirurgia de suplemento/i,
      /cirurgia de fitoterápico/i,
      /cirurgia de homeopatia/i,
      /cirurgia de acupuntura/i,
      /cirurgia de fisioterapia/i,
      /cirurgia de terapia ocupacional/i,
      /cirurgia de psicologia/i,
      /cirurgia de psiquiatria/i,
      /cirurgia de cardiologia/i,
      /cirurgia de neurologia/i,
      /cirurgia de ortopedia/i,
      /cirurgia de dermatologia/i,
      /cirurgia de ginecologia/i,
      /cirurgia de urologia/i,
      /cirurgia de pediatria/i,
      /cirurgia de geriatria/i,
      /cirurgia de oncologia/i,
      /cirurgia de hematologia/i,
      /cirurgia de endocrinologia/i,
      /cirurgia de gastroenterologia/i,
      /cirurgia de pneumologia/i,
      /cirurgia de reumatologia/i,
      /cirurgia de oftalmologia/i,
      /cirurgia de otorrinolaringologia/i,
      
      // Padrões de transcrição vazia ou genérica
      /^[.\s]*$/,
      /^[.,!?;:\s]*$/,
      /^[a-z\s]{1,10}$/i, // Textos muito curtos
      /^[^a-zA-Z]*$/, // Apenas pontuação
      
      // Padrões de ruído
      /^[hm]+$/i,
      /^[ah]+$/i,
      /^[eh]+$/i,
      /^[uh]+$/i,
      /^[oh]+$/i,
      
      // Padrões repetitivos
      /^(.+)\1{2,}$/, // Texto repetido 3+ vezes
    ]
    
    const normalizedText = text.trim().toLowerCase()
    
    // Verificar se é muito curto
    if (normalizedText.length < 3) {
      return true
    }
    
    // Verificar padrões genéricos
    for (const pattern of genericPatterns) {
      if (pattern.test(normalizedText)) {
        return true
      }
    }
    
    return false
  }, [])

  // Verificar se duas transcrições são muito similares
  const isSimilarTranscription = useCallback((text1: string, text2: string) => {
    if (!text1 || !text2) return false
    
    const normalized1 = text1.trim().toLowerCase()
    const normalized2 = text2.trim().toLowerCase()
    
    // Se são exatamente iguais
    if (normalized1 === normalized2) return true
    
    // Calcular similaridade simples (percentual de palavras em comum)
    const words1 = normalized1.split(/\s+/)
    const words2 = normalized2.split(/\s+/)
    
    if (words1.length < 3 || words2.length < 3) return false
    
    const commonWords = words1.filter(word => words2.includes(word))
    const similarity = commonWords.length / Math.max(words1.length, words2.length)
    
    // Se mais de 80% das palavras são iguais, considerar similar
    return similarity > 0.8
  }, [])

  // Função para detectar textos repetitivos ou automáticos
  const isRepetitiveText = useCallback((text: string): boolean => {
    // Primeiro, verificar se contém conteúdo de vídeo/legendas
    if (isVideoContent(text)) {
      return true
    }
    
    const cleanText = text.toLowerCase().trim()
    
    // Padrões de texto repetitivo
    const repetitivePatterns = [
      /^(não!?\s*){3,}/i, // "não não não"
      /^(sim!?\s*){3,}/i, // "sim sim sim"
      /^(\w+!?\s*)\1{2,}/i, // qualquer palavra repetida 3x
      /^(ok|okay|tá|certo|uhum)\s*$/i, // palavras muito curtas/automáticas
      /^[.!?]{2,}$/, // só pontuação
    ]
    
    if (repetitivePatterns.some(pattern => pattern.test(cleanText))) {
      return true
    }
    
    // Verificar repetição excessiva de palavras
    const words = cleanText.split(/\s+/)
    if (words.length >= 3) {
      const wordCount = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const maxFrequency = Math.max(...Object.values(wordCount))
      if (maxFrequency / words.length > 0.6) { // Se uma palavra aparece mais de 60%
        return true
      }
    }
    
    return false
  }, [])

  // Carregar dispositivos de áudio disponíveis
  const loadDevices = useCallback(async () => {
    try {
      console.log('🎤 Carregando dispositivos de áudio...')
      
      // Solicitar permissão primeiro
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      const microphones = deviceList
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microfone ${device.deviceId.substring(0, 8)}`
        }))
      
      setDevices(microphones)
      console.log('🎤 Dispositivos encontrados:', microphones.length)
      
      // Definir dispositivos padrão se não houver seleção
      if (!doctorMic && microphones.length > 0) {
        setDoctorMic(microphones[0].deviceId)
        console.log('🩺 Microfone padrão do médico:', microphones[0].label)
      }
      
      if (!patientMic && microphones.length > 1) {
        setPatientMic(microphones[1].deviceId)
        console.log('🧑‍⚕️ Microfone padrão do paciente:', microphones[1].label)
      } else if (!patientMic && microphones.length === 1) {
        // Se só há um microfone, usar o mesmo para ambos (com processamento diferente)
        setPatientMic(microphones[0].deviceId)
        console.log('⚠️ Usando mesmo microfone para ambos (será separado por volume)')
      }
      
      return microphones
    } catch (error) {
      console.error('❌ Erro ao carregar dispositivos:', error)
      setError('Erro ao acessar dispositivos de áudio')
      return []
    }
  }, [doctorMic, patientMic])

  // Processar chunk de áudio para transcrição
  const processAudioChunk = useCallback(async (audioBlob: Blob, speaker: 'doctor' | 'patient') => {
    if (processingRef.current[speaker]) {
      console.log(`⏩ Pulando processamento ${speaker} - já em andamento`)
      return
    }
    
    if (audioBlob.size < 5000) {
      console.log(`⏩ Pulando chunk ${speaker} - muito pequeno (${audioBlob.size} bytes)`)
      return // Pular chunks muito pequenos
    }
    
    if (audioBlob.size > 1000000) {
      console.log(`⏩ Pulando chunk ${speaker} - muito grande (${audioBlob.size} bytes)`)
      return // Pular chunks muito grandes
    }
    
    if (!audioBlob.type.startsWith('audio/')) {
      console.log(`❌ Tipo de arquivo inválido para ${speaker}: ${audioBlob.type}`)
      return
    }

    try {
      processingRef.current[speaker] = true
      lastActivityRef.current = Date.now() // Atualizar atividade
      
      console.log(`🎤 ENVIANDO CHUNK PARA TRANSCRIÇÃO (${speaker}):`, {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: audioBlob.size / 16000 // Estimativa de duração
      })

      // Filtrar chunks muito pequenos que podem ser ruído
      if (audioBlob.size < 20000) { // Menos de 20KB (aumentado)
        console.log(`⏩ PULANDO CHUNK ${speaker} - muito pequeno (${audioBlob.size} bytes)`)
        return
      }

      // Detectar se o áudio tem volume suficiente (não é silêncio)
      try {
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioContext = new AudioContext()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        // Calcular volume médio do áudio
        const channelData = audioBuffer.getChannelData(0)
        let sum = 0
        for (let i = 0; i < channelData.length; i++) {
          sum += Math.abs(channelData[i])
        }
        const averageVolume = sum / channelData.length
        
        console.log(`🔊 VOLUME DETECTADO (${speaker}):`, averageVolume)
        
        // Se o volume for muito baixo, é provavelmente silêncio
        if (averageVolume < 0.01) { // Threshold de volume
          console.log(`🔇 PULANDO CHUNK ${speaker} - volume muito baixo (${averageVolume})`)
          return
        }
        
        await audioContext.close()
      } catch (error) {
        console.warn('Erro ao analisar volume do áudio:', error)
      }

      // Detectar se o microfone está ativo (opcional - para debug)
      // const audioContext = new AudioContext()
      // const arrayBuffer = await audioBlob.arrayBuffer()
      // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      // const audioData = audioBuffer.getChannelData(0)
      // const isActive = detectActiveMicrophone(audioData, speaker)
      
      // Enviar para API de transcrição real com timeout
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')
      formData.append('speaker', speaker)
      formData.append('consultationId', config.consultationId)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Timeout de 30s atingido para ${speaker}, cancelando requisição...`)
        controller.abort()
      }, 30000) // 30s timeout - mais tempo para OpenAI processar
      
      // Armazenar referência do timeout para limpeza
      const timeoutRef = speaker === 'doctor' ? doctorTimeoutRef : patientTimeoutRef
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = timeoutId

      try {
        // Enviando requisição de transcrição
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        // Resposta recebida

        if (response.ok) {
          const result = await response.json()
          console.log(`📡 RESPOSTA DA API OPENAI (${speaker}):`, {
            text: result.text,
            success: result.success,
            mock: result.mock,
            filtered: result.filtered,
            confidence: result.confidence
          })
          
          // Verificar se a resposta é válida
          if (!result.success) {
            // Resposta com erro
            return
          }
          
          if (result.mock) {
            // Resposta mock ignorada
            return
          }
          
          if (result.filtered) {
            // Resposta filtrada ignorada
            return
          }
          
          if (result.text && result.text.trim()) {
            // Transcrição processada
            
            // Filtro ULTRA agressivo para bloquear conteúdo de vídeo
            if (isVideoContent(result.text)) {
              console.log('🚫 CONTEÚDO DE VÍDEO BLOQUEADO:', result.text)
              return
            }
            
            // Filtrar transcrições genéricas e de baixa qualidade
            if (isGenericTranscription(result.text)) {
              console.log('🚫 TRANSCRIÇÃO GENÉRICA FILTRADA:', result.text)
              return
            }
            
            // Verificar confiança mínima
            const confidence = result.confidence || 0.9
            if (confidence < 0.7) {
              // Transcrição com baixa confiança filtrada
              return
            }
            
            // Verificar se o texto tem contexto médico real
            if (!hasMedicalContext(result.text)) {
              console.log('🚫 SEM CONTEXTO MÉDICO FILTRADA:', result.text)
              return
            }
            
            // Verificar se é duplicata ou muito similar à última transcrição
            const lastText = lastTranscriptionRef.current[speaker]
            if (lastText && isSimilarTranscription(result.text, lastText)) {
              // Transcrição similar/duplicada filtrada
              return
            }
            
            // Verificar se já processamos esta transcrição exata
            const transcriptionKey = `${speaker}:${result.text}:${Date.now()}`
            if (processedTranscriptionsRef.current.has(result.text)) {
              // Transcrição duplicada ignorada
              return
            }
            
            // ✅ Transcrição aceita - adicionar ao store
            // Transcrição aceita
            
            // Adicionar ao conjunto de transcrições processadas
            processedTranscriptionsRef.current.add(result.text)
            
            // Limitar o tamanho do conjunto para evitar vazamento de memória
            if (processedTranscriptionsRef.current.size > 100) {
              const firstItem = processedTranscriptionsRef.current.values().next().value
              if (firstItem) {
                processedTranscriptionsRef.current.delete(firstItem)
              }
            }
            
            // Filtrar textos repetitivos e automáticos
            if (isRepetitiveText(result.text)) {
              console.log(`🚫 Texto repetitivo filtrado no processamento (${speaker}):`, result.text)
              return
            }
            
            // Verificar se é muito similar à última transcrição
            const lastSpeakerText = lastTranscriptionRef.current[speaker]
            if (lastSpeakerText && isSimilarTranscription(result.text, lastSpeakerText)) {
              console.log(`🚫 Texto similar filtrado no processamento (${speaker}):`, result.text)
              return
            }
            
            // Atualizar última transcrição
            lastTranscriptionRef.current[speaker] = result.text
            
            // Adicionar segmento final ao store com informação do speaker
            addFinalSegment({
              text: result.text,
              startMs: 0,
              endMs: 3000, // 3 segundos por chunk
              confidence: confidence,
              isPartial: false,
              speaker: speaker // Incluir informação do speaker
            })
            
            // Segmento adicionado ao store
          }
        } else {
          console.error(`❌ Erro na API de transcrição ${speaker}:`, response.status, response.statusText)
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn(`⏰ Requisição cancelada para ${speaker} - Timeout de 30s atingido`)
          // Tentar novamente com timeout menor se for abort por timeout
          console.log(`🔄 Tentando novamente ${speaker} com chunk menor...`)
          // Não re-throw o erro de abort, apenas log
        } else {
          console.error(`❌ Erro na requisição de transcrição ${speaker}:`, fetchError)
          // Não re-throw outros erros também para evitar quebrar o fluxo
        }
      }

    } catch (error) {
      console.error(`❌ Erro ao processar chunk de áudio ${speaker}:`, error)
    } finally {
      processingRef.current[speaker] = false
    }
  }, [config.consultationId])

  // Conectar ao SSE para receber transcrições em tempo real
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('⚠️ SSE já conectado')
      return
    }

    console.log('🔄 Conectando ao SSE para transcrições em tempo real...')
    
    const eventSource = new EventSource(`/api/transcriptions/stream?consultationId=${config.consultationId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('✅ SSE conectado')
      setRealtimeConnected(true)
      lastActivityRef.current = Date.now()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        lastActivityRef.current = Date.now()

        if (data.type === 'transcription') {
          console.log(`📝 Transcrição recebida via SSE (${data.speaker}):`, data.text)
          
          // Filtrar textos repetitivos e automáticos
          if (isRepetitiveText(data.text)) {
            console.log('🚫 Texto repetitivo filtrado via SSE:', data.text)
            return
          }
          
          // Verificar se é muito similar à última transcrição
          const lastSpeakerText = lastTranscriptionRef.current[data.speaker as 'doctor' | 'patient']
          if (lastSpeakerText && isSimilarTranscription(data.text, lastSpeakerText)) {
            console.log('🚫 Texto similar filtrado via SSE:', data.text)
            return
          }
          
          // Atualizar última transcrição
          lastTranscriptionRef.current[data.speaker as 'doctor' | 'patient'] = data.text
          
          // Adicionar segmento final ao store com informação do speaker
          addFinalSegment({
            text: data.text,
            startMs: 0,
            endMs: 3000, // 3 segundos por chunk
            confidence: data.confidence,
            isPartial: false,
            speaker: data.speaker // Incluir informação do speaker
          })
        } else if (data.type === 'connected') {
          console.log('🔗 SSE conectado para consulta:', data.consultationId)
        } else if (data.type === 'heartbeat') {
          // Apenas manter conexão viva
        }
      } catch (error) {
        console.warn('⚠️ Erro ao processar mensagem SSE:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ Erro no SSE:', error)
      setRealtimeConnected(false)
      
      // Reconectar automaticamente após 3 segundos
      if (eventSource.readyState === EventSource.CLOSED) {
        setTimeout(() => {
          if (isConnected && !isReconnectingRef.current) {
            console.log('🔄 Tentando reconectar SSE...')
            isReconnectingRef.current = true
            connectSSE()
            isReconnectingRef.current = false
          }
        }, 3000)
      }
    }
  }, [config.consultationId, addFinalSegment, setRealtimeConnected, isConnected])

  // Desconectar do SSE
  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('🔌 Desconectando SSE')
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setRealtimeConnected(false)
    }
  }, [setRealtimeConnected])

  // Configurar gravação para um microfone específico
  const setupMicrophoneRecording = useCallback(async (
    deviceId: string, 
    speaker: 'doctor' | 'patient'
  ): Promise<MediaStream | null> => {
    try {
      console.log(`🎤 Configurando microfone ${speaker}:`, deviceId)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Desabilitar AGC para evitar "inventar" voz do ruído
          sampleRate: 16000, // Reduzir para 16kHz para economizar banda
          channelCount: 1
        }
      })

      // Usar MediaRecorder nativo para capturar áudio em formato WebM
      console.log(`🎤 Configurando MediaRecorder para ${speaker}`)
      
      // Verificar se MediaRecorder é suportado
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder não é suportado neste navegador')
      }
      
      // Configurar MediaRecorder para capturar em chunks com fallbacks
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              // Usar o primeiro tipo suportado
              const supportedTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/wav',
                'audio/ogg'
              ]
              mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
            }
          }
        }
      }
      
      console.log(`🎵 Usando MIME type: ${mimeType} para ${speaker}`)
      
      let mediaRecorder: MediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType
        })
      } catch (recorderError) {
        console.warn(`⚠️ Erro ao criar MediaRecorder com configurações específicas para ${speaker}, tentando configuração básica:`, recorderError)
        // Tentar sem configurações específicas
        mediaRecorder = new MediaRecorder(stream)
      }
      
      const chunksRef = speaker === 'doctor' ? doctorChunksRef : patientChunksRef
      const recorderRef = speaker === 'doctor' ? doctorRecorderRef : patientRecorderRef
      const intervalRef = speaker === 'doctor' ? doctorIntervalRef : patientIntervalRef
      
      recorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length > 0 && !processingRef.current[speaker]) {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType })
          await processAudioChunk(audioBlob, speaker)
          chunksRef.current = []
        }
      }

      // Iniciar gravação em chunks de 3 segundos
      mediaRecorder.start()
      intervalRef.current = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          setTimeout(() => {
            if (mediaRecorder.state === 'inactive') {
              mediaRecorder.start()
            }
          }, 100)
        }
      }, 3000)

      console.log(`✅ Microfone ${speaker} configurado com sucesso`)
      return stream

    } catch (error) {
      console.error(`❌ Erro ao configurar microfone ${speaker}:`, error)
      setError(`Erro ao acessar microfone do ${speaker}`)
      return null
    }
  }, [])

  // Função sendSpeechSegment removida - usando MediaRecorder nativo agora

  // Conectar ao LiveKit e iniciar transcrição
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      console.log('⚠️ LiveKit já está conectando ou conectado')
      return
    }

    // Permitir conexão com pelo menos um microfone
    if (!doctorMic && !patientMic) {
      setError('Selecione pelo menos um microfone (médico ou paciente)')
      return
    }
    
    // Avisar se apenas um microfone está selecionado
    if (!doctorMic || !patientMic) {
      const missingMic = !doctorMic ? 'médico' : 'paciente'
      console.warn(`⚠️ Apenas microfone do ${missingMic === 'médico' ? 'paciente' : 'médico'} selecionado. Funcionando em modo single-mic.`)
    }

    try {
      setIsConnecting(true)
      setError(null)
      console.log('🔗 Conectando ao LiveKit com dois microfones...', config)

      // 0. Carregar dispositivos disponíveis
      await loadDevices()

      // 1. Obter token do LiveKit
      const tokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: config.consultationId,
          participantName: 'dual-mic-system',
          role: 'doctor'
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Erro ao obter token LiveKit')
      }

      const { token, mock } = await tokenResponse.json()

      if (mock) {
        console.warn('⚠️ Usando token mock - LiveKit não configurado')
        setError('LiveKit não configurado, usando modo fallback')
        setIsConnecting(false)
        return
      }

      // 2. Conectar à sala LiveKit
      const room = new Room()
      roomRef.current = room

      // Configurar eventos da sala
      room.on(RoomEvent.Connected, async () => {
        console.log('✅ Conectado ao LiveKit')
        setIsConnected(true)
        setIsConnecting(false)
        setRealtimeConnected(true)
        
        // Configurar microfones disponíveis
        console.log('🎤 Configurando microfones...')
        
        const streams = []
        const participants = []
        
        // Configurar microfone do médico se disponível
        if (doctorMic) {
          console.log('🎤 Configurando microfone do médico...')
          const doctorStream = await setupMicrophoneRecording(doctorMic, 'doctor')
          if (doctorStream) {
            doctorStreamRef.current = doctorStream
            streams.push(doctorStream)
            participants.push('doctor')
            console.log('✅ Microfone do médico configurado')
          }
        }
        
        // Configurar microfone do paciente se disponível
        if (patientMic) {
          console.log('🎤 Configurando microfone do paciente...')
          const patientStream = await setupMicrophoneRecording(patientMic, 'patient')
          if (patientStream) {
            patientStreamRef.current = patientStream
            streams.push(patientStream)
            participants.push('patient')
            console.log('✅ Microfone do paciente configurado')
          }
        }
        
        // Verificar se pelo menos um microfone foi configurado
        if (streams.length === 0) {
          throw new Error('Nenhum microfone pôde ser configurado')
        }
        
        console.log(`✅ ${streams.length} microfone(s) configurado(s): ${participants.join(', ')}`)
        
        // Atualizar lista de participantes
        setParticipants(participants)
        // Conectar SSE após LiveKit conectado
        connectSSE()
      })

      room.on(RoomEvent.Disconnected, () => {
        console.log('🔌 Desconectado do LiveKit')
        setIsConnected(false)
        setRealtimeConnected(false)
        setParticipants([])
      })

      // Conectar à sala
      const livekitUrl = config.livekitUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://medtutor-5b3jl6hp.livekit.cloud'
      await room.connect(livekitUrl, token)

      // 3. Conectar ao stream de transcrições em tempo real
      console.log('🔄 Configurando stream de transcrições...')
      
      const eventSource = new EventSource(
        `/api/transcriptions/stream?consultationId=${config.consultationId}`
      )
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('✅ Conectado ao stream de transcrições')
        console.log('🔗 SSE URL:', eventSource.url)
        console.log('🔗 SSE readyState:', eventSource.readyState)
      }

      eventSource.onmessage = (event) => {
        // Mensagem SSE recebida
        try {
          const data = JSON.parse(event.data)
          // Dados SSE parseados
          
          if (data.type === 'transcription') {
            // Transcrição recebida via SSE
            
            // Filtrar textos repetitivos e automáticos
            if (isRepetitiveText(data.text)) {
              // Texto repetitivo filtrado
              return
            }
            
            // Verificar se é muito similar à última transcrição
            const lastSpeakerText = lastTranscriptionRef.current[data.speaker as 'doctor' | 'patient']
            if (lastSpeakerText && isSimilarTranscription(data.text, lastSpeakerText)) {
              // Texto similar filtrado
              return
            }
            
            // Atualizar última transcrição
            lastTranscriptionRef.current[data.speaker as 'doctor' | 'patient'] = data.text
            
            // Atualizar UI em tempo real com informação do speaker
            addFinalSegment({
              text: data.text,
              startMs: data.timestamp - 3000,
              endMs: data.timestamp,
              confidence: data.confidence || 0.8,
              isPartial: false,
              speaker: data.speaker // Incluir informação do speaker
            })
          }
        } catch (error) {
          console.warn('⚠️ Erro ao processar mensagem SSE:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ Erro no stream de transcrições:', error)
        console.error('❌ SSE readyState:', eventSource.readyState)
        console.error('❌ SSE url:', eventSource.url)
        // Tentar reconectar após 5 segundos
        if (!isReconnectingRef.current) {
          isReconnectingRef.current = true
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Tentando reconectar stream de transcrições...')
            if (eventSourceRef.current) {
              eventSourceRef.current.close()
            }
            // Reconectar
            const newEventSource = new EventSource(
              `/api/transcriptions/stream?consultationId=${config.consultationId}`
            )
            eventSourceRef.current = newEventSource
            isReconnectingRef.current = false
          }, 5000)
        }
      }

    } catch (error) {
      console.error('❌ Erro ao conectar LiveKit:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      setIsConnecting(false)
      setRealtimeConnected(false)
    }
  }, [config, isConnecting, isConnected, doctorMic, patientMic, loadDevices, setupMicrophoneRecording, addFinalSegment, setRealtimeConnected])

  // Desconectar
  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando LiveKit...')
    
    // Limpar timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Limpar transcrições processadas
    processedTranscriptionsRef.current.clear()
    lastTranscriptionRef.current = { doctor: '', patient: '' }
    
    if (doctorIntervalRef.current) {
      clearInterval(doctorIntervalRef.current)
      doctorIntervalRef.current = null
    }
    
    if (patientIntervalRef.current) {
      clearInterval(patientIntervalRef.current)
      patientIntervalRef.current = null
    }
    
    // Desconectar VAD nodes
    if (doctorVADRef.current) {
      doctorVADRef.current.disconnect()
      doctorVADRef.current = null
    }
    if (patientVADRef.current) {
      patientVADRef.current.disconnect()
      patientVADRef.current = null
    }

    // Fechar AudioContexts
    if (doctorAudioContextRef.current) {
      doctorAudioContextRef.current.close()
      doctorAudioContextRef.current = null
    }
    if (patientAudioContextRef.current) {
      patientAudioContextRef.current.close()
      patientAudioContextRef.current = null
    }

    // Reset segmenters
    if (doctorSegmenterRef.current) {
      doctorSegmenterRef.current.reset()
      doctorSegmenterRef.current = null
    }
    if (patientSegmenterRef.current) {
      patientSegmenterRef.current.reset()
      patientSegmenterRef.current = null
    }
    
    // Parar streams
    if (doctorStreamRef.current) {
      doctorStreamRef.current.getTracks().forEach(track => track.stop())
      doctorStreamRef.current = null
    }
    
    if (patientStreamRef.current) {
      patientStreamRef.current.getTracks().forEach(track => track.stop())
      patientStreamRef.current = null
    }
    
    // Fechar EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    // Desconectar da sala
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    
    // Reset flags
    isReconnectingRef.current = false
    processingRef.current = { doctor: false, patient: false }
    
    setIsConnected(false)
    setIsConnecting(false)
    setRealtimeConnected(false)
    setParticipants([])
    setError(null)
    
  }, [setRealtimeConnected])

  // Monitor de atividade - verificar se a transcrição parou
  useEffect(() => {
    if (!isConnected) return

    const activityCheck = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      
      // Se não houve atividade por mais de 30 segundos, tentar reconectar
      if (timeSinceLastActivity > 30000 && !isReconnectingRef.current) {
        console.warn('⚠️ Nenhuma atividade detectada por 30s, verificando conexão...')
        
        // Verificar se o EventSource ainda está conectado
        if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CLOSED) {
          console.log('🔄 EventSource fechado, reconectando...')
          isReconnectingRef.current = true
          
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
          }
          
          const newEventSource = new EventSource(
            `/api/transcriptions/stream?consultationId=${config.consultationId}`
          )
          eventSourceRef.current = newEventSource
          isReconnectingRef.current = false
        }
      }
    }, 10000) // Verificar a cada 10 segundos

    return () => clearInterval(activityCheck)
  }, [isConnected, config.consultationId])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error,
    participants,
    devices,
    doctorMic,
    patientMic,
    setDoctorMic,
    setPatientMic,
    loadDevices,
    isSupported: () => typeof window !== 'undefined' && 'MediaRecorder' in window
  }
}
