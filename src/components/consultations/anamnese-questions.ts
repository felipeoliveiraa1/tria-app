export type AnamneseItem = { id: string; label: string };
export type AnamneseSection = { id: string; title: string; items: AnamneseItem[] };

export const ANAMNESE_SECTIONS: AnamneseSection[] = [
  {
    id: 'identificacao',
    title: 'Identificação',
    items: [
      { id: 'nome_completo', label: 'Qual seu nome completo?' },
      { id: 'idade', label: 'Idade?' },
      { id: 'sexo', label: 'Sexo?' },
      { id: 'cor_raca', label: 'Cor/raça?' },
      { id: 'nacionalidade_naturalidade', label: 'Nacionalidade e naturalidade?' },
      { id: 'estado_civil', label: 'Estado civil?' },
      { id: 'profissao', label: 'Profissão?' },
      { id: 'onde_mora', label: 'Onde mora atualmente?' },
      { id: 'procedencia', label: 'De onde veio (procedência)?' },
    ],
  },
  {
    id: 'qp',
    title: 'Queixa Principal (QP)',
    items: [
      { id: 'qp_queixa', label: 'Qual é sua principal queixa hoje?' },
      { id: 'qp_tempo', label: 'Há quanto tempo está sentindo isso?' },
    ],
  },
  {
    id: 'hma',
    title: 'História da Moléstia Atual (HMA)',
    items: [
      { id: 'hma_inicio', label: 'Quando começaram os sintomas?' },
      { id: 'hma_instalacao', label: 'Como eles começaram (súbito ou gradual)?' },
      { id: 'hma_localizacao', label: 'Onde sente (localização, irradiação, profundidade)?' },
      { id: 'hma_qualidade', label: 'Como é a dor/sintoma (tipo, qualidade)?' },
      { id: 'hma_freq_intensidade', label: 'Com que frequência e intensidade ocorre?' },
      { id: 'hma_fatores', label: 'O que piora ou melhora?' },
      { id: 'hma_desencadeia', label: 'Existe algo que desencadeia?' },
      { id: 'hma_associados', label: 'Tem outros sintomas associados?' },
      { id: 'hma_previos', label: 'Já fez exames ou tratamentos anteriores? Quais?' },
    ],
  },
  {
    id: 'ap',
    title: 'Antecedentes Pessoais (AP)',
    items: [
      { id: 'ap_nascimento_desenvolvimento', label: 'Como foi seu nascimento e desenvolvimento?' },
      { id: 'ap_doencas_importantes', label: 'Teve doenças importantes? Quais?' },
      { id: 'ap_cirurgias_hosp_exames', label: 'Já fez cirurgias, hospitalizações, exames relevantes?' },
      { id: 'ap_acidentes', label: 'Sofreu acidentes/traumatismos?' },
      { id: 'ap_alergias', label: 'Tem alergias?' },
      { id: 'ap_mulher_gineco', label: 'Se mulher: menarca, ciclo, anticoncepcionais, gestações/partos/abortos.' },
      { id: 'ap_contexto', label: 'Como é seu trabalho, moradia, alimentação, condições sanitárias?' },
      { id: 'ap_habitos', label: 'Tem hábitos de fumo, álcool, drogas?' },
      { id: 'ap_sono_humor', label: 'Como é seu sono e humor?' },
      { id: 'ap_medicamentos', label: 'Usa medicamentos? Quais e em que dose?' },
    ],
  },
  {
    id: 'af',
    title: 'Antecedentes Familiares (AF)',
    items: [
      { id: 'af_saude_familia', label: 'Como está a saúde dos pais, irmãos, cônjuge, filhos, avós?' },
      { id: 'af_semelhantes', label: 'Alguém na família teve doenças semelhantes?' },
      { id: 'af_hist_repeticao', label: 'Há histórico familiar (coração, diabetes, câncer etc.)?' },
      { id: 'af_obitos', label: 'Causas de falecimento de familiares?' },
    ],
  },
  {
    id: 'ida',
    title: 'Interrogatório Sintomatológico (IDA)',
    items: [
      { id: 'ida_cabeca', label: 'Cabeça: dor de cabeça, tontura?' },
      { id: 'ida_olhos', label: 'Olhos: visão embaçada, dor, perda de visão?' },
      { id: 'ida_ouvidos', label: 'Ouvidos: dor, secreção, zumbido, perda de audição?' },
      { id: 'ida_nariz', label: 'Nariz: obstrução, sangramento, secreção?' },
      { id: 'ida_boca_garganta', label: 'Boca/Garganta: dor, disfagia, rouquidão, problemas dentários?' },
      { id: 'ida_cardio_pulmonar', label: 'Coração/Pulmão: dor torácica, palpitações, dispneia, tosse?' },
      { id: 'ida_digestivo', label: 'Digestivo: apetite, náusea, vômito, dor abdominal, fezes?' },
      { id: 'ida_urinario_genital', label: 'Urinário/Genital: disúria, frequência, hematúria, corrimento, potência sexual?' },
      { id: 'ida_neurologico', label: 'Sistema nervoso: convulsão, tremores, fraqueza, dormência?' },
      { id: 'ida_musculoesqueletico', label: 'Ossos/articulações/músculos: dores, fraqueza, rigidez?' },
      { id: 'ida_endocrino', label: 'Endócrino: peso, intolerância térmica, crescimento anormal?' },
      { id: 'ida_linfatico', label: 'Linfático: gânglios, sangramentos, hematomas frequentes?' },
    ],
  },
];

