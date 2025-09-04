Hotfix imediato (2 minutos)

No wrapper do VAD, não envie áudio para os alto-falantes. Em vez de connect(...).connect(ctx.destination), prenda a cadeia num GainNode em 0. Também desligue AGC (autoGainControl), porque AGC “puxa” o ruído/eco.

// src/audio/vad-node.ts
export async function createVADNode(ctx: AudioContext, stream: MediaStream, onChange:(m:{active:boolean;rms:number;ts:number})=>void){
  await ctx.audioWorklet.addModule('/vad-worklet.js');
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'vad-processor');
  const sink = ctx.createGain();          // "sumidouro" inaudível
  sink.gain.value = 0;                    // nada sai nos alto-falantes

  node.port.onmessage = (e) => onChange(e.data);
  src.connect(node).connect(sink).connect(ctx.destination); // grafo ativo, mas mudo
  return { node, src, sink };
}

// Ao criar os streams de cada mic:
const constraints: MediaStreamConstraints = {
  audio: {
    deviceId: { exact: selectedDeviceId },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,    // <— DESLIGA AGC
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 16
  }
};


Teste: se o “eco” vinha do próprio app, isso some na hora.

Prompt único para o Cursor (cola como está)
Quero um patch para o projeto TRIA que resolva vazamento/mistura de falas no modo de 2 microfones. Entregue exatamente os arquivos/trechos abaixo.

## 1) Verificação de dispositivos (groupId) e alerta

- Arquivo: `src/components/telemed/DualMicLiveKitTranscriber.tsx`
- Ao selecionar os dois mics, chame `assertDistinctDevices(doctorDeviceId, patientDeviceId)`.
- Implemente util:

```ts
async function assertDistinctDevices(docId: string, patId: string){
  const devs = await navigator.mediaDevices.enumerateDevices();
  const d = devs.find(x=>x.deviceId===docId);
  const p = devs.find(x=>x.deviceId===patId);
  if (!d || !p) return;
  // Se groupId for igual, o SO pode estar espelhando o mesmo sinal
  if (d.groupId && p.groupId && d.groupId === p.groupId) {
    console.warn('[TRIA] Ambos os mics têm o MESMO groupId:', d.groupId, d, p);
    // exiba toast/alert na UI:
    // "Atenção: seus dois microfones pertencem ao mesmo grupo de hardware/continuidade.
    // Escolha dois dispositivos físicos distintos (ex.: USB + embutido) para evitar mistura."
  }
}

2) NUNCA monitorar os mics nos alto-falantes

Arquivo: src/audio/vad-node.ts

Garanta este grafo: src -> worklet -> gain(0) -> destination. Nada de som audível.

Já ajuste autoGainControl: false nas constraints.

export async function createVADNode(ctx: AudioContext, stream: MediaStream, onChange:(m:{active:boolean;rms:number;ts:number})=>void){
  await ctx.audioWorklet.addModule('/vad-worklet.js');
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'vad-processor');
  const sink = ctx.createGain();
  sink.gain.value = 0;
  node.port.onmessage = (e) => onChange(e.data);
  src.connect(node).connect(sink).connect(ctx.destination);
  return { node, src, sink };
}

3) Arbiter de Dominância de Falante (floor control) no cliente

Novo arquivo: src/audio/dominant-speaker.ts

Objetivo: somente UM lado pode enviar chunks para STT por vez, com “hold” de 900ms após ativação de fala. Troca só ocorre se o outro lado ficar claramente dominante (rms 2x por 220ms).

export type SpeakerRole = 'doctor' | 'patient';

export class DominantSpeakerArbiter {
  private state = {
    doctor: { active: false, rms: 0, t: 0 },
    patient: { active: false, rms: 0, t: 0 },
  };
  private current: SpeakerRole | null = null;
  private holdUntil = 0;

  private params = {
    holdMs: 900,
    overrideMs: 220,
    switchFactor: 1.9,
  };

  update(role: SpeakerRole, active: boolean, rms: number, now = performance.now()){
    const s = this.state[role];
    s.active = active; s.rms = rms; s.t = now;

    const other: SpeakerRole = role === 'doctor' ? 'patient' : 'doctor';
    const me = this.state[role], ot = this.state[other];

    // Se ninguém no floor ainda:
    if (this.current === null) {
      if (me.active && !ot.active) this.take(role, now);
      else if (me.active && ot.active) {
        if (me.rms >= ot.rms * this.params.switchFactor) this.take(role, now);
      }
      return;
    }
    // Se já tenho floor
    if (this.current === role) {
      // mantém se estou ativo; ao soltar e o outro ficar ativo, cede após hold
      if (!me.active && ot.active && now > this.holdUntil) this.take(other, now);
      return;
    }
    // Outro tem o floor -> só pego se posso override
    if (me.active && now > this.holdUntil) {
      if (me.rms >= ot.rms * this.params.switchFactor &&
          (now - ot.t) >= this.params.overrideMs) {
        this.take(role, now);
      }
    }
  }

  private take(role: SpeakerRole, now: number){
    this.current = role;
    this.holdUntil = now + this.params.holdMs;
  }

  canSend(role: SpeakerRole){ return this.current === role; }
}


Integração:

Arquivo: src/components/telemed/DualMicLiveKitTranscriber.tsx (ou no hook use-dual-livekit-stt.ts)

Instancie const arbiter = useRef(new DominantSpeakerArbiter()).current;

Nos callbacks de VAD de cada mic: arbiter.update('doctor', active, rms) e arbiter.update('patient', active, rms).

Antes de enviar qualquer chunk para /api/transcribe, checar: if (!arbiter.canSend('doctor')) return; (ou patient).

4) Cross-correlation rápida para derrubar eco

Ainda no componente/hook: quando ambos VADs estiverem ativos, rode uma correlação simples de janelas recentes (por ex. 160 amostras @16kHz ~10ms; ±3 lags). Se correlação > 0.85, classifique como “mesma fonte” e bloquie o lado de menor RMS naquele intervalo.

Pseudocódigo util (implemente em src/audio/corr.ts):

export function corr(a: Float32Array, b: Float32Array){
  // z-normalize e compute corr Pearson
  const n = Math.min(a.length, b.length);
  let sa=0,sb=0; for(let i=0;i<n;i++){ sa+=a[i]; sb+=b[i]; }
  const ma=sa/n, mb=sb/n;
  let n1=0, da=0, db=0;
  for(let i=0;i<n;i++){
    const xa=a[i]-ma, xb=b[i]-mb;
    n1 += xa*xb; da += xa*xa; db += xb*xb;
  }
  return n1 / Math.max(1e-9, Math.sqrt(da*db));
}


Use buffer circular de ~200ms por mic para pegar trechos e decidir.

5) Backend continua “speaker-locked”

Confirmar em src/app/api/transcribe/route.ts:

O campo speaker vindo do cliente é validado contra o binding da sessão. Se não bate, 400.

O backend NÃO troca o label do speaker.

Garanta ids separados por pipeline (ex.: utteranceId prefixado por papel) para o agregador não mesclar blocos.

6) Debug opcional

Flag NEXT_PUBLIC_DEBUG_VAD=1 exibe overlay com:

VAD doctor: ON/OFF, RMS

VAD patient: ON/OFF, RMS

currentSpeaker e tempo restante de hold

aviso quando groupId coincide

Critérios de aceite

Com o app mudo (sem monitorar), nenhum mic “escuta” o retorno do outro.

Se ambos falam, só um envia chunks (arbitragem por floor/hold).

Se o sinal for praticamente igual nos dois mics (eco), a correlação > 0.85 derruba o lado de menor RMS.

O backend nunca troca speaker e rejeita label inconsistente.