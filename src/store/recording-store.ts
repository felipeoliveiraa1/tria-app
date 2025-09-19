import { create } from 'zustand'

export interface TranscriptSegment {
  id: string
  text: string
  speaker: 'doctor' | 'patient'
  timestamp: number
  confidence?: number
}

interface RecordingState {
  finalSegments: TranscriptSegment[]
  partialText: string
  consultationId: string | null
  isRecording: boolean
  
  // Actions
  addFinalSegment: (segment: TranscriptSegment) => void
  setPartialText: (text: string) => void
  setConsultationId: (id: string | null) => void
  setIsRecording: (recording: boolean) => void
  clearSegments: () => void
  removeSegment: (id: string) => void
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  finalSegments: [],
  partialText: '',
  consultationId: null,
  isRecording: false,

  addFinalSegment: (segment) => {
    set((state) => ({
      finalSegments: [...state.finalSegments, segment]
    }))
  },

  setPartialText: (text) => {
    set({ partialText: text })
  },

  setConsultationId: (id) => {
    set({ consultationId: id })
  },

  setIsRecording: (recording) => {
    set({ isRecording: recording })
  },

  clearSegments: () => {
    set({ 
      finalSegments: [],
      partialText: ''
    })
  },

  removeSegment: (id) => {
    set((state) => ({
      finalSegments: state.finalSegments.filter(segment => segment.id !== id)
    }))
  }
}))
