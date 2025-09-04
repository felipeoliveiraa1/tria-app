Você é um engenheiro sênior de áudio/STT. Quero corrigir um bug onde transcrições aparecem sob o falante errado quando usamos DOIS microfones (um do médico e outro do paciente). Implementar um fluxo robusto que:

1) MAPEIA CADA MICROFONE A UM PAPEL FIXO
2) RODA VAD (voice activity detection) INDEPENDENTE POR MIC
3) ENVIA CADA STREAM PARA SUA PRÓPRIA PIPELINE DE STT, COM METADADO speaker="doctor"|"patient"
4) RESOLVE CASOS DE SOBREPOSIÇÃO/“ECO” COM REGRAS DETERMINÍSTICAS
5) GARANTE QUE O BACKEND NUNCA MUDE O SPEAKER RECEBIDO DAQUELE MIC

## Objetivo de Produto
- Se eu falar no mic do **médico**, a transcrição sai **sempre como MÉDICO**.
- Se eu falar no mic do **paciente**, a transcrição sai **sempre como PACIENTE**.
- Quando houver captação cruzada/eco, o sistema decide com base em VAD/SNR e **nunca troca o label** do mic.

---

## Alterações solicitadas (arquivos e trechos)

### A) UI/Estado: mapeamento explícito Mic → Papel
- **Arquivo**: `src/components/telemed/DualMicLiveKitTranscriber.tsx`
- **Ações**:
  1. Adicionar UI de seleção para dois `MediaDeviceInfo.deviceId` (Doctor Mic e Patient Mic). Persistir em `localStorage` (`tria.micMap`).
  2. Estado:
     ```ts
     type SpeakerRole = 'doctor' | 'patient';
     type MicMap = { doctorDeviceId: string; patientDeviceId: string; };
     ```
  3. Ao iniciar captura, chamar `getUserMedia` duas vezes (uma por mic) com `deviceId` de cada papel; **não** use um único stream misto.

- **Constraints do getUserMedia** (ativos para cada mic):
  ```ts
  const constraints: MediaStreamConstraints = {
    audio: {
      deviceId: { exact: selectedDeviceId },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000, // se suportado
      sampleSize: 16
    }
  };
Observação: AEC ajuda a reduzir vazamento do outro falante. Se o ambiente já usa retorno de áudio, manter echoCancellation: true.

B) VAD por mic usando AudioWorklet (baixa latência)
Arquivos:

src/audio/vad-worklet.ts (worklet processor)

src/audio/vad-node.ts (wrapper para criar o node)

Implementação:

Crie um AudioWorkletProcessor que calcula energia RMS por janela de 20ms e Zero-Crossing Rate (ZCR).

Estado com histerese: active quando RMS > onThreshold por 2 janelas consecutivas; desativa quando RMS < offThreshold por 5 janelas consecutivas.

Exponha mensagens postMessage({ active, rms, ts }) para o thread principal.

Exemplo resumido do processor (ES module):

ts
Copiar código
// file: src/audio/vad-worklet.ts
class VADProcessor extends AudioWorkletProcessor {
  private active = false;
  private above = 0;
  private below = 0;
  private onThreshold = 0.015;   // ajuste fino depois
  private offThreshold = 0.008;  // histerese
  private sampleRateHz = sampleRate; // global

  process(inputs: Float32Array[][]) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const rms = Math.sqrt(sum / input.length);

    if (rms > this.onThreshold) { this.above++; this.below = 0; }
    else if (rms < this.offThreshold) { this.below++; this.above = 0; }

    if (!this.active && this.above >= 2) { this.active = true; this.port.postMessage({ active: true, rms, ts: currentTime }); }
    if (this.active && this.below >= 5) { this.active = false; this.port.postMessage({ active: false, rms, ts: currentTime }); }

    return true;
  }
}
registerProcessor('vad-processor', VADProcessor);
Wrapper:

ts
Copiar código
// file: src/audio/vad-node.ts
export async function createVADNode(ctx: AudioContext, stream: MediaStream, onChange:(m:{active:boolean;rms:number;ts:number})=>void){
  await ctx.audioWorklet.addModule('/vad-worklet.js'); // build para servir este módulo
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'vad-processor');
  node.port.onmessage = (e) => onChange(e.data);
  src.connect(node).connect(ctx.destination); // opcional: não roteie ao destino em prod
  return { node, src };
}
C) Duas pipelines de STT independentes + metadata de speaker
Arquivo: src/hooks/use-dual-livekit-stt.ts (ou equivalente)

Ações:

Criar duas instâncias de pipeline STT: doctorStt e patientStt.

Cada pipeline recebe apenas áudio do seu mic e envia blocos/frames (ou chunks) para /api/transcribe com:

json
Copiar código
{
  "consultationId": "...",
  "speaker": "doctor" | "patient",
  "chunkIndex": 123,
  "ts": 1725401023.200
}
o áudio (pcm/ogg/webm).

Importante: o cliente NUNCA atribui o outro rótulo àquele mic. O rótulo é fixo por pipeline.

D) Backend: reforçar “speaker locking” e regras anti-mistura
Arquivo: src/app/api/transcribe/route.ts (ou onde está a sua rota de STT)

Ações:

Validar sessão do usuário e persistir em memória/Redis uma chave:

css
Copiar código
micBinding: { consultationId -> { clientId -> { mic1: 'doctor', mic2: 'patient' } } }
O clientId pode ser da sessão Supabase ou do LiveKit identity.

Quando chegar uma requisição com { speaker }, confirme que a conexão e o mic associado a este token realmente tem esse speaker fixado. Se não, rejeitar (HTTP 400).

A resposta do STT deve ecoar o speaker recebido; o backend não re-atribui.

Arquivo: src/app/api/transcriptions/stream/route.ts

Quando for emitir SSE/broadcast, não re-decidimos speaker. Somente disseminamos a transcrição com o rótulo que veio da pipeline correta.

Adicionar campo confidence se o modelo retornar; manter para heurísticas no front.

E) Resolução de sobreposição (cross-talk/eco) no cliente
Arquivo: src/components/telemed/DualMicLiveKitTranscriber.tsx

Lógica:

Recebemos eventos vadDoctor.active, vadPatient.active e transcrições parciais/finais de cada pipeline.

Se ambos VAD ativos e recebemos transcrições em uma janela de 500ms:

Calcular escore simples de qualidade por pipeline: score = alpha * rms - beta * overlapPenalty

alpha=1, beta=0.5, overlapPenalty = 1 quando ambos ativos.

Se o rms médio nos últimos 200ms de um pipeline for maior, preferimos esse como falante primário; o secundário (provável eco) é silenciado (não renderizar) a menos que o conteúdo textual seja claramente diferente (levenshtein > 0.5 com 80%+ de tokens distintos).

Se os textos forem similares (provável eco), drop do secundário.

Se apenas um VAD ativo, aceitar apenas a transcrição desse lado nos próximos 400ms (histerese de “floor hold”).

Fornecer flags de debug (no console) para ver rms, active, decisões e descartes.

F) (Opcional, mas recomendado) Auto-mute do mic oposto durante fala ativa
Enquanto vadDoctor.active === true, reduza o ganho do patientStream para -15 dB (gain node) e vice-versa. Isso reduz ainda mais eco/bleed:

ts
Copiar código
const gainNode = ctx.createGain();
gainNode.gain.value = 1.0; // normal
// quando o outro lado falar:
gainNode.gain.setTargetAtTime(0.18, ctx.currentTime, 0.02);
// ao liberar:
gainNode.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
G) Persistência e proteção
Armazenar MicMap (deviceId de cada papel) no localStorage e revalidar dispositivos disponíveis a cada carregamento da tela de consulta.

Bloquear transcrição se o mic não estiver mapeado (exibir aviso “selecione os dois microfones”).

Critérios de Aceite (QA)
Troca de Papéis: Alternando fala entre os dois mics físicos, as transcrições aparecem sempre com o papel correto (doctor/patient).

Eco/Sobreposição: Ao falar propositalmente próximo do outro mic, apenas a pipeline com maior RMS (e VAD ativo) é exibida; o eco é descartado.

Sem Re-rotulagem: O backend nunca muda speaker—ele só valida e repete. Logs mostram rejeição se um mic tentar enviar transcrição com outro label.

Estabilidade: Sem quedas de FPS/CPU no browser. Janela VAD 20ms com histerese não introduz latência perceptível (> ~60ms).

Telemed Page: Se um mic não for selecionado, o botão “Iniciar” fica desabilitado com tooltip explicativa.

Entregáveis
Novos arquivos:

src/audio/vad-worklet.ts

src/audio/vad-node.ts

Alterações:

src/components/telemed/DualMicLiveKitTranscriber.tsx (UI, VAD, regra de sobreposição, ganho)

src/hooks/use-dual-livekit-stt.ts (duas pipelines independentes com metadado speaker)

src/app/api/transcribe/route.ts (validação speaker locking)

src/app/api/transcriptions/stream/route.ts (propagar speaker sem redecidir)

Implemente exatamente como descrito acima. Depois, crie um flag NEXT_PUBLIC_DEBUG_VAD=1 para mostrar no overlay da tela RMS/ativo por papel.
