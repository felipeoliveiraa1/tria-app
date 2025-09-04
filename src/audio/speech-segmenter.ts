export interface SpeechSegment {
  pcm16: Int16Array;
  durationMs: number;
  speechRatio: number;
  startTime: number;
  endTime: number;
}

export interface VADDebug {
  active: boolean;
  rms: number;
  now: number;
}

export class SpeechSegmenter {
  private sampleRate = 16000;
  private windowSize = 320; // 20ms @ 16kHz
  private preRollMs = 150;
  private silenceTimeoutMs = 400;
  private minDurationMs = 300; // Reduzir para 300ms
  private maxDurationMs = 12000;
  private minSpeechRatio = 0.35;
  private calibrationMs = 1200;
  
  // Estado de calibração
  private isCalibrating = true;
  private calibrationStartTime = 0;
  private rmsHistory: number[] = [];
  private baselineRms = 0;
  private rmsStdDev = 0;
  
  // Thresholds
  private onThreshold = 0.015;
  private offThreshold = 0.008;
  
  // Estado do VAD
  private isActive = false;
  private activeStartTime = 0;
  private lastActiveTime = 0;
  
  // Buffers
  private preRollBuffer: Float32Array[] = [];
  private currentSegment: Float32Array[] = [];
  private silenceTimeout: NodeJS.Timeout | null = null;
  
  // Callbacks
  public onSegment?: (segment: SpeechSegment) => void;
  public vadDebug?: (debug: VADDebug) => void;
  
  constructor() {
    this.calibrationStartTime = Date.now();
  }
  
  push(frame: Float32Array, tsMs: number): void {
    // Calibração inicial
    if (this.isCalibrating) {
      this.updateCalibration(frame);
      return;
    }
    
    // Processar VAD
    const rms = this.calculateRMS(frame);
    const isVoice = rms > this.onThreshold;
    
    // Debug callback
    if (this.vadDebug) {
      this.vadDebug({
        active: this.isActive,
        rms,
        now: tsMs
      });
    }
    
    // Log de debug a cada 50 frames (1 segundo)
    if (Math.floor(tsMs / 1000) % 2 === 0 && Math.floor(tsMs / 100) % 10 === 0) {
      console.log(`🎤 VAD Debug: RMS=${rms.toFixed(4)}, Threshold=${this.onThreshold.toFixed(4)}, Voice=${isVoice}, Active=${this.isActive}`);
    }
    
    // Gerenciar estado ativo com histerese
    if (isVoice && !this.isActive) {
      this.startSegment(tsMs);
    } else if (!isVoice && this.isActive) {
      // Só considerar silêncio se RMS estiver abaixo do threshold de desligamento
      if (rms < this.offThreshold) {
        this.handleSilence(tsMs);
      }
    }
    
    // Adicionar frame ao segmento atual
    if (this.isActive) {
      this.currentSegment.push(new Float32Array(frame));
      this.lastActiveTime = tsMs;
    }
    
    // Manter pré-roll buffer
    this.preRollBuffer.push(new Float32Array(frame));
    if (this.preRollBuffer.length > this.preRollMs / 20) { // 150ms / 20ms
      this.preRollBuffer.shift();
    }
  }
  
  private updateCalibration(frame: Float32Array): void {
    const rms = this.calculateRMS(frame);
    this.rmsHistory.push(rms);
    
    // Calibração completa após 1200ms
    if (Date.now() - this.calibrationStartTime >= this.calibrationMs) {
      this.finishCalibration();
    }
  }
  
  private finishCalibration(): void {
    if (this.rmsHistory.length === 0) return;
    
    // Calcular baseline e desvio padrão
    const sum = this.rmsHistory.reduce((a, b) => a + b, 0);
    this.baselineRms = sum / this.rmsHistory.length;
    
    const variance = this.rmsHistory.reduce((acc, rms) => {
      return acc + Math.pow(rms - this.baselineRms, 2);
    }, 0) / this.rmsHistory.length;
    this.rmsStdDev = Math.sqrt(variance);
    
    // Definir thresholds mais sensíveis
    this.onThreshold = Math.max(this.baselineRms * 2.0, 0.008); // Mais sensível
    this.offThreshold = this.onThreshold * 0.7; // Menos histerese
    
    this.isCalibrating = false;
    
    console.log('🎤 Calibração VAD concluída:', {
      baseline: this.baselineRms,
      stdDev: this.rmsStdDev,
      onThreshold: this.onThreshold,
      offThreshold: this.offThreshold
    });
  }
  
  private calculateRMS(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }
  
  private startSegment(tsMs: number): void {
    this.isActive = true;
    this.activeStartTime = tsMs;
    this.currentSegment = [];
    
    console.log(`🎤 Iniciando segmento de fala - RMS: ${this.calculateRMS(new Float32Array(512))}`);
    
    // Adicionar pré-roll
    this.currentSegment.push(...this.preRollBuffer);
    
    // Limpar timeout de silêncio
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }
  
  private handleSilence(tsMs: number): void {
    if (!this.isActive) return;
    
    // Configurar timeout para finalizar segmento
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    this.silenceTimeout = setTimeout(() => {
      this.finishSegment();
    }, this.silenceTimeoutMs);
  }
  
  private finishSegment(): void {
    if (!this.isActive || this.currentSegment.length === 0) return;
    
    const durationMs = Date.now() - this.activeStartTime;
    
    // Verificar duração mínima
    if (durationMs < this.minDurationMs) {
      this.resetSegment();
      return;
    }
    
    // Converter para PCM16
    const totalSamples = this.currentSegment.reduce((sum, frame) => sum + frame.length, 0);
    const pcm16 = new Int16Array(totalSamples);
    let offset = 0;
    
    for (const frame of this.currentSegment) {
      for (let i = 0; i < frame.length; i++) {
        // Converter float32 [-1,1] para int16 [-32768,32767]
        const sample = Math.max(-1, Math.min(1, frame[i]));
        pcm16[offset + i] = Math.round(sample * 32767);
      }
      offset += frame.length;
    }
    
    // Calcular speech ratio (simplificado)
    const speechRatio = this.estimateSpeechRatio();
    
    // Verificar critérios de qualidade
    if (durationMs > this.maxDurationMs || speechRatio < this.minSpeechRatio) {
      this.resetSegment();
      return;
    }
    
    // Emitir segmento
    console.log(`🎤 Finalizando segmento - Duração: ${durationMs}ms, SpeechRatio: ${speechRatio.toFixed(2)}, Samples: ${pcm16.length}`);
    
    if (this.onSegment) {
      this.onSegment({
        pcm16,
        durationMs,
        speechRatio,
        startTime: this.activeStartTime,
        endTime: Date.now()
      });
    }
    
    this.resetSegment();
  }
  
  private estimateSpeechRatio(): number {
    // Simplificado: assumir que se chegou até aqui, é fala válida
    // Em implementação real, analisaria frequências características da fala
    return 0.7; // Valor conservador
  }
  
  private resetSegment(): void {
    this.isActive = false;
    this.currentSegment = [];
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }
  
  reset(): void {
    this.isCalibrating = true;
    this.calibrationStartTime = Date.now();
    this.rmsHistory = [];
    this.resetSegment();
    this.preRollBuffer = [];
  }
  
  // Método para atualizar thresholds dinamicamente
  updateThresholds(onThreshold: number, offThreshold: number): void {
    this.onThreshold = onThreshold;
    this.offThreshold = offThreshold;
  }
}
