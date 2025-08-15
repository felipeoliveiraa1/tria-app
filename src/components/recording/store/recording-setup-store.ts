import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecordingSetupState {
  // Campos do formulário
  mode: 'presencial' | 'telemedicina' | null
  patientId: string | null
  context: string
  deviceId: string | null
  sampleRate: number | null
  consent: boolean
  
  // Dados da consulta criada
  consultationId: string | null
  
  // Ações
  setField: <K extends keyof Omit<RecordingSetupState, 'setField' | 'reset'>>(
    field: K, 
    value: RecordingSetupState[K]
  ) => void
  reset: () => void
}

const initialState = {
  mode: null,
  patientId: null,
  context: '',
  deviceId: null,
  sampleRate: null,
  consent: false,
  consultationId: null,
}

export const useRecordingSetupStore = create<RecordingSetupState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setField: (field, value) => set({ [field]: value }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'recording-setup-storage',
      partialize: (state) => ({
        mode: state.mode,
        patientId: state.patientId,
        context: state.context,
        deviceId: state.deviceId,
        sampleRate: state.sampleRate,
        consent: state.consent,
      }),
    }
  )
)

