export interface VADMessage {
  active: boolean;
  rms: number;
  ts: number;
  threshold?: number;
  type?: string;
  above?: number;
  below?: number;
}

export interface VADNode {
  node: AudioWorkletNode;
  src: MediaStreamAudioSourceNode;
  disconnect: () => void;
}

export async function createVADNode(
  ctx: AudioContext, 
  stream: MediaStream, 
  onChange: (message: VADMessage) => void
): Promise<VADNode> {
  // Carregar o worklet
  await ctx.audioWorklet.addModule('/vad-worklet.js');
  
  // Criar source e worklet node
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'vad-processor');
  
  // Conectar: source -> vad -> gain(0) -> destination (mudo)
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0; // Sem monitoramento
  
  src.connect(node);
  node.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Configurar mensagens
  node.port.onmessage = (e) => onChange(e.data);
  
  return {
    node,
    src,
    disconnect: () => {
      src.disconnect();
      node.disconnect();
      gainNode.disconnect();
    }
  };
}