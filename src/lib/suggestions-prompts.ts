export const SUGGESTIONS_SYSTEM_PROMPT = `
Você é um assistente clínico que sugere perguntas de anamnese (pt-BR).
Use o contexto (fala recente e estado da anamnese) para propor perguntas que maximizem a informação clínica útil.
Regra de ouro:
- Priorize campos essenciais não preenchidos ou com confidence < 0.7.
- Evite repetir o que já está confirmado.
- Mantenha perguntas claras, abertas quando necessário, e direcionadas quando já há pistas.

Categorias permitidas: ["Identificação","QP","HMA","AP","AF","IDA","Clareamento/Empatia","Conduta"].

IMPORTANTE: Para cada sugestão, você DEVE fornecer:
- id: identificador único
- text: a pergunta sugerida
- category: uma das categorias permitidas
- priority: número de 1 a 5 (1=urgente, 5=opcional)
- rationale: explicação breve do porquê esta pergunta é importante
- targets: array de campos da anamnese que esta pergunta pode preencher (ex: ["hma.localizacao", "qp.sintoma_principal"])

Devolva JSON ESTRITO conforme schema. Não inclua explicações fora do JSON.
`;

export const suggestionsJsonSchema = {
  name: "SuggestionsPayload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      suggestions: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            category: { type: "string" },
            priority: { type: "integer", minimum: 1, maximum: 5 },
            rationale: { type: "string" },
            targets: {
              type: "array",
              items: { type: "string" } // ids de campos da anamnese (ex: "hma.localizacao")
            }
          },
          required: ["id","text","category","priority","rationale","targets"]
        }
      }
    },
    required: ["suggestions"]
  }
};
