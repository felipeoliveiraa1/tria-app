import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hsefijaswekywdezexto.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZWZpamFzd2VreXdkZXpleHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTI4NDksImV4cCI6MjA3MDYyODg0OX0.FZq-tvno9KrQTc0E5zy-xtj4fIR9Um6l3N2UJ5fPEc0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Tipos para as tabelas do banco
export interface User {
  id: string
  email: string
  full_name: string
  specialty?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  city: string
  status: 'active' | 'inactive'
  doctor_id: string
  created_at: string
  updated_at: string
}

export interface Consultation {
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
  created_at: string
  updated_at: string
}

export interface PatientWithConsultations extends Patient {
  consultations: Consultation[]
  consultation_count: number
}

export interface ConsultationWithPatient extends Consultation {
  patient: Patient
}

