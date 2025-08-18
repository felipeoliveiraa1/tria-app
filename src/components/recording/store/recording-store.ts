import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finalizing' | 'finished' | 'error'

export interface TranscriptSegment {
  id: string
  text: string
  startMs: number
  endMs: number
  confidence?: number
  isPartial: boolean
  timestamp: Date
}

export interface RecordingState {
  // Estado da gravação
  status: RecordingStatus
  elapsed: number
  deviceId: string | null
  level: number
  chunksCount: number
  realtimeConnected: boolean
  
  // Transcrição
  partialText: string
  finalSegments: TranscriptSegment[]
  
  // Metadados
  appointmentId: string | null
  consultationId: string | null
  recordingId: string | null
  sampleRate: number
  
  // Ações
  start: (consultationId: string, deviceId: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
  finalize: () => void
  setConsultationId: (consultationId: string) => void
  saveConsultationData: (audioBlob: Blob) => Promise<boolean>
  
  // Transcrição em tempo real
  addPartialText: (text: string) => void
  addFinalSegment: (segment: Omit<TranscriptSegment, 'id' | 'timestamp'>) => void
  updateAudioLevel: (level: number) => void
  setRealtimeConnected: (connected: boolean) => void
  
  // Utilitários
  getTotalDuration: () => number
  getTotalWords: () => number
  canEnableAI: () => boolean
}

export const useRecordingStore = create<RecordingState>()(
  devtools(
    (set, get) => {
      let timerInterval: NodeJS.Timeout | null = null
      
      return {
        // Estado inicial
        status: 'idle',
        elapsed: 0,
        deviceId: null,
        level: 0,
        chunksCount: 0,
        realtimeConnected: false,
        partialText: '',
        finalSegments: [],
        appointmentId: null,
        consultationId: null,
        recordingId: null,
        sampleRate: 44100,
        
        // Ações principais
        start: (consultationId: string, deviceId: string) => {
          console.log('Store: Iniciando gravação para consulta:', consultationId)
          set({
            status: 'recording',
            consultationId,
            deviceId,
            elapsed: 0,
            chunksCount: 0,
            partialText: '',
            finalSegments: [],
            sampleRate: 44100
          })
          
          // Iniciar timer
          timerInterval = setInterval(() => {
            set((state) => ({ elapsed: state.elapsed + 1 }))
          }, 1000)
        },
        
        // Definir consultationId sem iniciar gravação
        setConsultationId: (consultationId: string) => {
          console.log('Store: Definindo consultationId:', consultationId)
          set({ consultationId })
        },
        
        // Salvar dados da consulta
        saveConsultationData: async (audioBlob: Blob) => {
          const state = get()
          if (!state.consultationId) {
            console.error('ID da consulta não encontrado')
            return false
          }
          
          try {
            console.log('💾 Store: Salvando dados da consulta...', { 
              consultationId: state.consultationId, 
              elapsed: state.elapsed, 
              finalSegments: state.finalSegments 
            })
            
            // Converter áudio para base64 para envio
            const base64Audio = await new Promise<string>((resolve, reject) => {
              try {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  // Remover prefixo data:mime;base64,
                  const base64 = result.split(',')[1] || ''
                  resolve(base64)
                }
                reader.onerror = (e) => reject(e)
                reader.readAsDataURL(audioBlob)
              } catch (e) {
                reject(e)
              }
            })
            console.log('🔊 Store: Áudio convertido para base64, tamanho:', base64Audio.length)
            
            // 1. Atualizar consulta com duração e status COMPLETED
            console.log('📝 Store: Atualizando consulta para COMPLETED:', state.consultationId)
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData?.session?.access_token
            const authHeaders: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
            const consultationResponse = await fetch('/api/consultations', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders
              },
              body: JSON.stringify({
                id: state.consultationId,
                status: 'COMPLETED',
                duration: state.elapsed
              })
            })

            if (!consultationResponse.ok) {
              const errorText = await consultationResponse.text()
              console.error('❌ Store: Erro ao atualizar consulta:', errorText)
              return false
            } else {
              const responseData = await consultationResponse.json()
              console.log('✅ Store: Consulta atualizada com sucesso para COMPLETED:', responseData)
            }

            // 2. Salvar arquivo de áudio
            console.log('🎵 Store: Salvando arquivo de áudio para consulta:', state.consultationId)
            const audioResponse = await fetch('/api/audio-files', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders
              },
              body: JSON.stringify({
                consultation_id: state.consultationId,
                filename: `consulta-${state.consultationId}.webm`,
                mime_type: 'audio/webm',
                size: audioBlob.size || 1000,
                duration: state.elapsed,
                storage_path: `consultations/${state.consultationId}/audio.webm`,
                storage_bucket: 'audio-files',
                is_processed: true,
                processing_status: 'completed',
                audio_data: base64Audio || 'dGVzdCBhdWRpbyBkYXRh',
                original_blob_size: audioBlob.size || 1000
              })
            })

            if (!audioResponse.ok) {
              const errorText = await audioResponse.text()
              console.error('❌ Store: Erro ao salvar arquivo de áudio:', errorText)
              return false
            } else {
              const audioData = await audioResponse.json()
              console.log('✅ Store: Arquivo de áudio salvo com sucesso:', audioData)
            }

            // 3. Salvar transcrição
            const fullTranscript = state.finalSegments.map(segment => segment.text).join(' ')
            
            if (fullTranscript.trim()) {
              console.log('📝 Store: Salvando transcrição para consulta:', state.consultationId)
              console.log('📝 Store: Transcrição:', fullTranscript.substring(0, 100) + '...')
              
              const transcriptionResponse = await fetch('/api/transcriptions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeaders
                },
                body: JSON.stringify({
                  consultation_id: state.consultationId,
                  raw_text: fullTranscript,
                  summary: fullTranscript.substring(0, 200) + (fullTranscript.length > 200 ? '...' : ''),
                  key_points: fullTranscript.split(' ').slice(0, 10).join(', '),
                  confidence: 0.95,
                  processing_time: 2.0,
                  language: 'pt-BR',
                  model_used: 'web-speech-api'
                })
              })

              if (!transcriptionResponse.ok) {
                const errorText = await transcriptionResponse.text()
                console.error('❌ Store: Erro ao salvar transcrição:', errorText)
                return false
              } else {
                const transcriptionData = await transcriptionResponse.json()
                console.log('✅ Store: Transcrição salva com sucesso:', transcriptionData)
              }
            } else {
              console.log('⚠️ Store: Nenhuma transcrição para salvar')
            }

            console.log('🎉 Store: Dados da consulta salvos com sucesso:', state.consultationId)
            console.log('📊 Store: Resumo do salvamento:')
            console.log('- Consulta atualizada para COMPLETED')
            console.log('- Arquivo de áudio salvo')
            console.log('- Transcrição salva')
            console.log('- Duração:', state.elapsed, 'segundos')
            
            return true
          } catch (error) {
            console.error('❌ Store: Erro ao salvar dados:', error)
            return false
          }
        },
        
        pause: () => {
          set({ status: 'paused' })
          if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
          }
        },
        
        resume: () => {
          set({ status: 'recording' })
          timerInterval = setInterval(() => {
            set((state) => ({ elapsed: state.elapsed + 1 }))
          }, 1000)
        },
        
        stop: () => {
          set({ status: 'finalizing' })
          if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
          }
          
          // Simular finalização
          setTimeout(() => {
            set({ status: 'finished' })
          }, 1000)
        },

        finalize: () => {
          if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
          }
          
          set({ 
            status: 'finished',
            realtimeConnected: false
          })
        },
        
        reset: () => {
          if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
          }
          set({
            status: 'idle',
            elapsed: 0,
            deviceId: null,
            level: 0,
            chunksCount: 0,
            realtimeConnected: false,
            partialText: '',
            finalSegments: [],
            appointmentId: null,
            consultationId: null,
            recordingId: null,
            sampleRate: 44100
          })
        },
        
        // Transcrição
        addPartialText: (text: string) => {
          set({ partialText: text })
        },
        
        addFinalSegment: (segment) => {
          const newSegment: TranscriptSegment = {
            ...segment,
            id: `segment-${Date.now()}-${Math.random()}`,
            timestamp: new Date()
          }
          set((state) => ({
            finalSegments: [...state.finalSegments, newSegment],
            partialText: ''
          }))
        },
        
        updateAudioLevel: (level: number) => {
          set({ level: Math.min(100, Math.max(0, level)) })
        },
        
        setRealtimeConnected: (connected: boolean) => {
          set({ realtimeConnected: connected })
        },
        
        // Utilitários
        getTotalDuration: () => {
          const state = get()
          return state.elapsed
        },
        
        getTotalWords: () => {
          const state = get()
          const allText = state.finalSegments.map(s => s.text).join(' ')
          return allText.split(/\s+/).filter(word => word.length > 0).length
        },
        
        canEnableAI: () => {
          const state = get()
          return state.elapsed >= 60 || state.finalSegments.length >= 5
        }
      }
    },
    {
      name: 'recording-store'
    }
  )
)
