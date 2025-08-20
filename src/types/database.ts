export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string
          cpf: string | null
          birth_date: string | null
          is_doctor: boolean
          specialty: string | null
          crm: string | null
          subscription_type: 'FREE' | 'PRO' | 'ENTERPRISE'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone: string
          cpf?: string | null
          birth_date?: string | null
          is_doctor?: boolean
          specialty?: string | null
          crm?: string | null
          subscription_type?: 'FREE' | 'PRO' | 'ENTERPRISE'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string
          cpf?: string | null
          birth_date?: string | null
          is_doctor?: boolean
          specialty?: string | null
          crm?: string | null
          subscription_type?: 'FREE' | 'PRO' | 'ENTERPRISE'
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          doctor_id: string
          name: string
          email: string | null
          phone: string | null
          city: string | null
          state: string | null
          birth_date: string | null
          gender: 'M' | 'F' | 'O' | null
          cpf: string | null
          address: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          medical_history: string | null
          allergies: string | null
          current_medications: string | null
          status: 'active' | 'inactive' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          name: string
          email?: string | null
          phone?: string | null
          city?: string | null
          state?: string | null
          birth_date?: string | null
          gender?: 'M' | 'F' | 'O' | null
          cpf?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          status?: 'active' | 'inactive' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          city?: string | null
          state?: string | null
          birth_date?: string | null
          gender?: 'M' | 'F' | 'O' | null
          cpf?: string | null
          address?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          status?: 'active' | 'inactive' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      consultations: {
        Row: {
          id: string
          doctor_id: string
          patient_id: string
          patient_name: string
          patient_context: string | null
          consultation_type: 'PRESENCIAL' | 'TELEMEDICINA'
          status: 'CREATED' | 'RECORDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'CANCELLED'
          duration: number | null
          recording_url: string | null
          notes: string | null
          diagnosis: string | null
          treatment: string | null
          prescription: string | null
          next_appointment: string | null
          anamnese: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          patient_id: string
          patient_name: string
          patient_context?: string | null
          consultation_type: 'PRESENCIAL' | 'TELEMEDICINA'
          status?: 'CREATED' | 'RECORDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'CANCELLED'
          duration?: number | null
          recording_url?: string | null
          notes?: string | null
          diagnosis?: string | null
          treatment?: string | null
          prescription?: string | null
          next_appointment?: string | null
          anamnese?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          patient_id?: string
          patient_name?: string
          patient_context?: string | null
          consultation_type?: 'PRESENCIAL' | 'TELEMEDICINA'
          status?: 'CREATED' | 'RECORDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'CANCELLED'
          duration?: number | null
          recording_url?: string | null
          notes?: string | null
          diagnosis?: string | null
          treatment?: string | null
          prescription?: string | null
          next_appointment?: string | null
          anamnese?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      transcriptions: {
        Row: {
          id: string
          consultation_id: string
          raw_text: string
          summary: string | null
          key_points: string[] | null
          diagnosis: string | null
          treatment: string | null
          observations: string | null
          confidence: number
          processing_time: number | null
          language: string
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          consultation_id: string
          raw_text: string
          summary?: string | null
          key_points?: string[] | null
          diagnosis?: string | null
          treatment?: string | null
          observations?: string | null
          confidence: number
          processing_time?: number | null
          language?: string
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          consultation_id?: string
          raw_text?: string
          summary?: string | null
          key_points?: string[] | null
          diagnosis?: string | null
          treatment?: string | null
          observations?: string | null
          confidence?: number
          processing_time?: number | null
          language?: string
          model_used?: string | null
          created_at?: string
        }
      }
      audio_files: {
        Row: {
          id: string
          consultation_id: string
          filename: string
          original_name: string | null
          mime_type: string
          size: number
          duration: number | null
          storage_path: string
          storage_bucket: string
          is_processed: boolean
          processing_status: 'pending' | 'processing' | 'completed' | 'error'
          uploaded_at: string
        }
        Insert: {
          id?: string
          consultation_id: string
          filename: string
          original_name?: string | null
          mime_type: string
          size: number
          duration?: number | null
          storage_path: string
          storage_bucket?: string
          is_processed?: boolean
          processing_status?: 'pending' | 'processing' | 'completed' | 'error'
          uploaded_at?: string
        }
        Update: {
          id?: string
          consultation_id?: string
          filename?: string
          original_name?: string | null
          mime_type?: string
          size?: number
          duration?: number | null
          storage_path?: string
          storage_bucket?: string
          is_processed?: boolean
          processing_status?: 'pending' | 'processing' | 'completed' | 'error'
          uploaded_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          consultation_id: string
          title: string
          content: string | null
          type: 'SUMMARY' | 'PRESCRIPTION' | 'REPORT' | 'NOTES' | 'CUSTOM'
          format: string
          storage_path: string | null
          storage_bucket: string
          created_at: string
        }
        Insert: {
          id?: string
          consultation_id: string
          title: string
          content?: string | null
          type: 'SUMMARY' | 'PRESCRIPTION' | 'REPORT' | 'NOTES' | 'CUSTOM'
          format: string
          storage_path?: string | null
          storage_bucket?: string
          created_at?: string
        }
        Update: {
          id?: string
          consultation_id?: string
          title?: string
          content?: string | null
          type?: 'SUMMARY' | 'PRESCRIPTION' | 'REPORT' | 'NOTES' | 'CUSTOM'
          format?: string
          storage_path?: string | null
          storage_bucket?: string
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          content: string
          type: 'SUMMARY' | 'PRESCRIPTION' | 'REPORT' | 'NOTES' | 'CUSTOM'
          is_public: boolean
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          content: string
          type: 'SUMMARY' | 'PRESCRIPTION' | 'REPORT' | 'NOTES' | 'CUSTOM'
          is_public?: boolean
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          content?: string
          type?: 'SUMMARY' | 'PRESCRIPTION' | 'REPORT' | 'NOTES' | 'CUSTOM'
          is_public?: boolean
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      consultation_stats: {
        Row: {
          doctor_id: string
          doctor_name: string
          total_consultations: number
          completed_consultations: number
          recording_consultations: number
          avg_duration: number | null
          total_transcriptions: number
          total_audio_files: number
        }
      }
      patient_history: {
        Row: {
          patient_id: string
          patient_name: string
          patient_email: string | null
          patient_phone: string | null
          consultation_id: string
          consultation_type: string
          status: string
          duration: number | null
          consultation_date: string
          patient_context: string | null
          transcription_text: string | null
          transcription_summary: string | null
          confidence: number | null
          audio_filename: string | null
          audio_size: number | null
          audio_duration: number | null
        }
      }
    }
    Functions: {
      get_patient_stats: {
        Args: {
          patient_uuid: string
        }
        Returns: {
          total_consultations: number
          completed_consultations: number
          total_duration: number
          total_transcriptions: number
          total_audio_files: number
          last_consultation_date: string | null
        }[]
      }
      get_patient_consultations: {
        Args: {
          patient_uuid: string
        }
        Returns: {
          consultation_id: string
          consultation_type: string
          status: string
          duration: number | null
          created_at: string
          patient_context: string | null
          has_transcription: boolean
          has_audio: boolean
        }[]
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Patient = Database['public']['Tables']['patients']['Row']
export type Consultation = Database['public']['Tables']['consultations']['Row']
export type Transcription = Database['public']['Tables']['transcriptions']['Row']
export type AudioFile = Database['public']['Tables']['audio_files']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Template = Database['public']['Tables']['templates']['Row']

export type ConsultationStats = Database['public']['Views']['consultation_stats']['Row']
export type PatientHistory = Database['public']['Views']['patient_history']['Row']

export type PatientStats = Database['public']['Functions']['get_patient_stats']['Returns'][0]
export type PatientConsultations = Database['public']['Functions']['get_patient_consultations']['Returns'][0]


