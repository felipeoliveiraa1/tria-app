export interface AudioUploadData {
  speaker: string;
  consultationId: string;
  lang?: string;
  audio: ArrayBuffer;
  sampleRate: number;
  format: string;
}

export function makeMultipart(data: AudioUploadData): FormData {
  const formData = new FormData();
  
  let audioBlob: Blob;
  let filename: string;
  
  if (data.format === 'pcm16') {
    // Converter PCM16 para WAV
    const pcm16Data = new Int16Array(data.audio);
    
    // Validar dados PCM16
    if (pcm16Data.length === 0) {
      throw new Error('Dados PCM16 vazios');
    }
    
    // Verificar se há dados válidos (não todos zeros)
    const hasValidData = Array.from(pcm16Data).some(sample => sample !== 0);
    if (!hasValidData) {
      throw new Error('Dados PCM16 contêm apenas zeros');
    }
    
    console.log(`🎵 Criando WAV: ${pcm16Data.length} samples, ${data.sampleRate}Hz, ${pcm16Data.length / data.sampleRate}s`);
    
    const wavBuffer = createWavHeader(pcm16Data, data.sampleRate);
    audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    filename = 'audio.wav';
  } else {
    // Usar formato original
    audioBlob = new Blob([data.audio], { 
      type: data.format === 'wav' ? 'audio/wav' : 'audio/webm' 
    });
    filename = data.format === 'wav' ? 'audio.wav' : 'audio.webm';
  }
  
  formData.append('audio', audioBlob, filename);
  formData.append('speaker', data.speaker);
  formData.append('consultationId', data.consultationId);
  formData.append('sampleRate', data.sampleRate.toString());
  formData.append('format', data.format);
  
  if (data.lang) {
    formData.append('lang', data.lang);
  }
  
  return formData;
}

export function convertFloat32ToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);
  
  for (let i = 0; i < float32Array.length; i++) {
    // Converter float32 [-1,1] para int16 [-32768,32767]
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = Math.round(sample * 32767);
  }
  
  return pcm16;
}

export function createWavHeader(pcmData: Int16Array, sampleRate: number): ArrayBuffer {
  const length = pcmData.length * 2; // 2 bytes per sample
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // RIFF header
  view.setUint32(0, 0x46464952, false); // "RIFF"
  view.setUint32(4, 36 + length, true); // File size
  view.setUint32(8, 0x45564157, false); // "WAVE"
  
  // fmt chunk
  view.setUint32(12, 0x20746d66, false); // "fmt "
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true); // Audio format (PCM)
  view.setUint16(22, 1, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  
  // data chunk
  view.setUint32(36, 0x61746164, false); // "data"
  view.setUint32(40, length, true); // Data size
  
  // Copy PCM data
  const dataView = new DataView(buffer, 44);
  for (let i = 0; i < pcmData.length; i++) {
    dataView.setInt16(i * 2, pcmData[i], true);
  }
  
  return buffer;
}
