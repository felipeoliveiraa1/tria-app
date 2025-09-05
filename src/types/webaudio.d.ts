// Definições de tipos para Web Audio API
declare global {
  class AudioWorkletProcessor {
    readonly port: MessagePort;
    process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
    static get parameterDescriptors(): AudioParamDescriptor[];
  }

  function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

  interface AudioWorkletGlobalScope {
    currentTime: number;
    sampleRate: number;
    registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;
  }

  const currentTime: number;
  const sampleRate: number;
}

export {};
