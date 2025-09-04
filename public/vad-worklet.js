class VADProcessor extends AudioWorkletProcessor {
  private active = false;
  private above = 0;
  private below = 0;
  private onThreshold = 0.015;   // será calibrado dinamicamente
  private offThreshold = 0.008;  // histerese
  private sampleRateHz = sampleRate; // global
  private windowSize = 320; // 20ms @ 16kHz
  private buffer: Float32Array = new Float32Array(this.windowSize);
  private bufferIndex = 0;

  process(inputs: Float32Array[][]) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    // Acumular amostras até completar uma janela
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.bufferIndex] = input[i];
      this.bufferIndex++;
      
      if (this.bufferIndex >= this.windowSize) {
        this.processWindow();
        this.bufferIndex = 0;
      }
    }

    return true;
  }

  private processWindow() {
    // Calcular RMS
    let sum = 0;
    for (let i = 0; i < this.windowSize; i++) {
      sum += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sum / this.windowSize);

    // Aplicar histerese
    if (rms > this.onThreshold) { 
      this.above++; 
      this.below = 0; 
    } else if (rms < this.offThreshold) { 
      this.below++; 
      this.above = 0; 
    }

    // Ativar/desativar com histerese
    if (!this.active && this.above >= 2) { 
      this.active = true; 
      this.port.postMessage({ 
        active: true, 
        rms, 
        ts: currentTime,
        threshold: this.onThreshold 
      }); 
    }
    
    if (this.active && this.below >= 5) { 
      this.active = false; 
      this.port.postMessage({ 
        active: false, 
        rms, 
        ts: currentTime,
        threshold: this.offThreshold 
      }); 
    }

    // Enviar dados de debug
    this.port.postMessage({ 
      type: 'vad-debug',
      active: this.active, 
      rms, 
      ts: currentTime,
      above: this.above,
      below: this.below
    });
  }

  // Método para atualizar thresholds via mensagem
  static get parameterDescriptors() {
    return [];
  }
}

registerProcessor('vad-processor', VADProcessor);