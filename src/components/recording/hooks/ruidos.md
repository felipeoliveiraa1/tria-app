Quero corrigir o envio de áudio no TRIA para que a transcrição só ocorra quando houver FALA real no microfone de cada papel. Implementar:

## 0) Premissas
- Projeto Next.js já tem "dual-mic" e rotas `/api/transcribe`.
- Manter LiveKit como está; alterar somente a CAPTURA e o ENVIO ao STT.

## 1) Tornar a captura realmente muda (sem monitorar no speaker)
- Arquivo: `src/audio/vad-node.ts` (ou equivalente). Garanta que a cadeia seja:
  `MediaStreamSource -> AudioWorkletNode(vad) -> GainNode(0) -> destination`.
- Constraints do `getUserMedia` por mic:
  ```ts
  audio: {
    deviceId: { exact: selectedDeviceId },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,  // desligar AGC pra não "inventar" voz do ruído
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 16
  }
2) Calibração de ruído + VAD com histerese
Novo arquivo: src/audio/speech-segmenter.ts

Implementar um segmentador que:

calibra o ruído por ~1200ms (RMS médio e desvio);

define onThreshold = max( baseline * 3.0, 0.015 ) e offThreshold = onThreshold * 0.6;

mantém histerese: ativa após 2 janelas acima de onThreshold, desativa após 5 janelas abaixo de offThreshold;

agrega um pré-roll de 150ms (amostras imediatamente anteriores ao start);

fecha o segmento quando ficar 400ms sem voz (silêncio).

só emite um segmento quando duration in [0.6s, 12s] e speechRatio >= 0.35.

expõe:

ts
Copiar código
class SpeechSegmenter {
  push(frame: Float32Array, tsMs: number): void;
  onSegment?: (seg: { pcm16: Int16Array; durationMs: number; speechRatio: number }) => void;
  vadDebug?: (d:{active:boolean;rms:number;now:number}) => void;
  reset(): void;
}
Use janela de 20ms @16 kHz (320 amostras). Converter para pcm16 no final do segmento.

3) Integrar no dual-mic: enviar apenas segmentos válidos
Arquivo: src/hooks/use-dual-livekit-stt.ts (ou onde monta os chunks)

Remover a lógica de “enviar a cada 3s”.

Para cada mic/papel crie um AudioContext + AudioWorklet (se já existir) e conecte a um SpeechSegmenter.

No callback segmenter.onSegment, faça o POST para /api/transcribe:

ts
Copiar código
await fetch('/api/transcribe', {
  method: 'POST',
  body: makeMultipart({
    speaker, consultationId,
    lang: 'pt', // se aplicável no backend
    audio: seg.pcm16.buffer,  // Blob de PCM16 LE 16kHz mono
    sampleRate: 16000,
    format: 'pcm16'
  })
})
Adicionar floor-control simples (se já não houver):

Quando doctor estiver com VAD ativo, segure o “piso” por 900ms; só troque para patient se patient.rms >= doctor.rms * 1.9 por ≥ 220ms.

Se dois VADs ativos simultaneamente, mute o ganho do lado não dominante para -15 dB enquanto o dominante falar.

4) Filtro de eco/mesma-fonte (curto)
Se ambos VAD ativos, mantenha um buffer circular de 200ms por mic.

Calcular correlação Pearson entre janelas; se corr > 0.85, considere eco e não envie segmento do lado com menor RMS nessa janela.

5) Segurança no servidor (segunda linha de defesa)
Arquivo: src/app/api/transcribe/route.ts

Antes de chamar a OpenAI:

Recalcular RMS e detectar % de janelas “vozeadas” no PCM recebido.

Se speechRatio < 0.25 ou rms < 0.008: retorne { success: true, filtered: true, text: "" } sem chamar a API (curto-circuito).

Manter validação de speaker (speaker-lock) e nunca re-rotular.

6) UI e debug
NEXT_PUBLIC_DEBUG_VAD=1: exibir overlay com RMS/active por papel, currentSpeaker e hold restante.

Se os dois deviceId tiverem mesmo groupId, mostrar toast: “Selecione dois dispositivos físicos distintos”.

7) Critérios de aceite
Parado em silêncio -> nenhuma requisição a /api/transcribe.

Ao falar, o primeiro texto parcial chega em < 300 ms após término da palavra.

Sem frases aleatórias; eco não gera segmento no lado fraco.

markdown
Copiar código

---

### Por que isso resolve agora
- **Sem monitoramento**: o app não realimenta seu próprio áudio pros mics.  
- **AGC off**: evita “puxar” ruído de fundo e transformar em pseudo-fala.  
- **Calibração**: threshold fica adequado ao seu ambiente e microfone.  
- **Segmentação**: você **só** envia áudio quando há fala contínua (e com pré-roll para não cortar a primeira sílaba).  
- **Hold + correlação**: elimina sobreposição/eco e “vira-casaca” de speaker.