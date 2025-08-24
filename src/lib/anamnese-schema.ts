export type Field = {
  value: any;
  confidence: number;
  evidence_text: string | null;
  confirmed: boolean;
};

export type Section = Record<string, Field>;
export type AnamneseState = {
  identificacao: Section;
  qp: Section;
  hma: Section;
  ap: Section;
  af: Section;
  ida: Section;
};

export const EMPTY_FIELD = (): Field => ({
  value: null,
  confidence: 0,
  evidence_text: null,
  confirmed: false,
});

export function emptyState(): AnamneseState {
  const f = EMPTY_FIELD;
  return {
    identificacao: {
      nome_completo: f(), idade: f(), sexo: f(), cor_raca: f(),
      nacionalidade_naturalidade: f(), estado_civil: f(), profissao: f(),
      onde_mora: f(), procedencia: f(),
    },
    qp: { queixa: f(), tempo: f() },
    hma: {
      inicio: f(), instalacao: f(), localizacao: f(), qualidade: f(),
      freq_intensidade: f(), fatores: f(), desencadeia: f(), associados: f(), previos: f(),
    },
    ap: {
      nascimento_desenvolvimento: f(), doencas_importantes: f(), cirurgias_hosp_exames: f(),
      acidentes: f(), alergias: f(), mulher_gineco: f(), contexto: f(),
      habitos: f(), sono_humor: f(), medicamentos: f(),
    },
    af: { saude_familia: f(), semelhantes: f(), hist_repeticao: f(), obitos: f() },
    ida: {
      cabeca: f(), olhos: f(), ouvidos: f(), nariz: f(), boca_garganta: f(),
      cardio_pulmonar: f(), digestivo: f(), urinario_genital: f(), neurologico: f(),
      musculoesqueletico: f(), endocrino: f(), linfatico: f(),
    },
  };
}

/** Merge: não sobrescreve confirmed=true; troca somente se a nova confidence for maior. 
 * Auto-confirma campos com confidence >= 0.6 */
export function mergeAnamnese(base: AnamneseState, incoming: Partial<AnamneseState>): AnamneseState {
  const out: AnamneseState = structuredClone(base ?? emptyState());
  for (const secKey of Object.keys(incoming || {})) {
    const incSec = (incoming as any)[secKey] || {};
    const curSec = (out as any)[secKey] || {};
    for (const fieldKey of Object.keys(incSec)) {
      const inc: Field = incSec[fieldKey];
      const cur: Field = curSec[fieldKey];
      if (!cur) { 
        // Auto-confirmar se confidence >= 0.6
        if (inc && typeof inc === 'object' && 'confidence' in inc && (inc.confidence ?? 0) >= 0.6) {
          inc.confirmed = true;
        }
        curSec[fieldKey] = inc; 
        continue; 
      }
      if (cur.confirmed) continue;
      if (inc && typeof inc === 'object' && 'confidence' in inc) {
        if ((inc.confidence ?? 0) > (cur.confidence ?? 0)) {
          // Auto-confirmar se confidence >= 0.6
          if ((inc.confidence ?? 0) >= 0.6) {
            inc.confirmed = true;
          }
          curSec[fieldKey] = inc;
        }
      } else {
        curSec[fieldKey] = inc;
      }
    }
    (out as any)[secKey] = curSec;
  }
  return out;
}

/** JSON Schema para Structured Output do Responses API */
export const anamneseJsonSchema = {
  name: "AnamneseState",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      identificacao: sectionSchema(["nome_completo","idade","sexo","cor_raca","nacionalidade_naturalidade","estado_civil","profissao","onde_mora","procedencia"]),
      qp: sectionSchema(["queixa","tempo"]),
      hma: sectionSchema(["inicio","instalacao","localizacao","qualidade","freq_intensidade","fatores","desencadeia","associados","previos"]),
      ap: sectionSchema(["nascimento_desenvolvimento","doencas_importantes","cirurgias_hosp_exames","acidentes","alergias","mulher_gineco","contexto","habitos","sono_humor","medicamentos"]),
      af: sectionSchema(["saude_familia","semelhantes","hist_repeticao","obitos"]),
      ida: sectionSchema(["cabeca","olhos","ouvidos","nariz","boca_garganta","cardio_pulmonar","digestivo","urinario_genital","neurologico","musculoesqueletico","endocrino","linfatico"]),
    },
  },
  strict: true,
};

function fieldSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      value: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
      confidence: { type: "number" },
      evidence_text: { anyOf: [{ type: "string" }, { type: "null" }] },
      confirmed: { type: "boolean" },
    },
    required: ["value", "confidence", "evidence_text", "confirmed"],
  };
}

function sectionSchema(keys: string[]) {
  const props: Record<string, any> = {};
  keys.forEach(k => props[k] = fieldSchema());
  return { type: "object", additionalProperties: false, properties: props };
}

