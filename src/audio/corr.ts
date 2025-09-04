// Cross-correlation para detectar eco entre microfones
export function corr(a: Float32Array, b: Float32Array): number {
  // z-normalize e compute correlação Pearson
  const n = Math.min(a.length, b.length);
  
  if (n === 0) return 0;
  
  // Calcular médias
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  
  // Calcular correlação
  let n1 = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    n1 += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  
  return n1 / Math.max(1e-9, Math.sqrt(da * db));
}

// Buffer circular para armazenar amostras de áudio
export class CircularBuffer {
  private buffer: Float32Array;
  private writeIndex = 0;
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Float32Array(size);
  }

  write(data: Float32Array) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.size;
    }
  }

  getLastSamples(count: number): Float32Array {
    const result = new Float32Array(count);
    let readIndex = (this.writeIndex - count + this.size) % this.size;
    
    for (let i = 0; i < count; i++) {
      result[i] = this.buffer[readIndex];
      readIndex = (readIndex + 1) % this.size;
    }
    
    return result;
  }

  getSize(): number {
    return this.size;
  }
}

// Detector de eco usando cross-correlation
export class EchoDetector {
  private doctorBuffer: CircularBuffer;
  private patientBuffer: CircularBuffer;
  private correlationThreshold = 0.85;
  private windowSize = 160; // ~10ms @ 16kHz

  constructor(bufferSizeMs = 200, sampleRate = 16000) {
    const bufferSize = Math.floor((bufferSizeMs * sampleRate) / 1000);
    this.doctorBuffer = new CircularBuffer(bufferSize);
    this.patientBuffer = new CircularBuffer(bufferSize);
  }

  addSamples(role: 'doctor' | 'patient', samples: Float32Array) {
    if (role === 'doctor') {
      this.doctorBuffer.write(samples);
    } else {
      this.patientBuffer.write(samples);
    }
  }

  detectEcho(): { isEcho: boolean; correlation: number; dominantRole: 'doctor' | 'patient' | null } {
    const doctorSamples = this.doctorBuffer.getLastSamples(this.windowSize);
    const patientSamples = this.patientBuffer.getLastSamples(this.windowSize);

    const correlation = corr(doctorSamples, patientSamples);
    const isEcho = correlation > this.correlationThreshold;

    if (isEcho) {
      // Calcular RMS para determinar qual é o dominante
      const doctorRMS = Math.sqrt(doctorSamples.reduce((sum, x) => sum + x * x, 0) / doctorSamples.length);
      const patientRMS = Math.sqrt(patientSamples.reduce((sum, x) => sum + x * x, 0) / patientSamples.length);
      
      const dominantRole = doctorRMS > patientRMS ? 'doctor' : 'patient';
      
      console.log(`🔄 [EchoDetector] Eco detectado! Correlação: ${correlation.toFixed(3)}, Dominante: ${dominantRole}`);
      
      return { isEcho: true, correlation, dominantRole };
    }

    return { isEcho: false, correlation, dominantRole: null };
  }
}

