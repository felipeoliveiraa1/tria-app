import { useState, useEffect, useCallback } from 'react'
import { supabase, Patient, Consultation, User } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

async function fetchJSON(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  for (let i = 0; i < 2; i++) {
    const res = await fetch(url, { cache: 'no-store', ...init, headers: { ...headers, ...(init?.headers as any) } })
    if (res.ok) return res.json()
    if (res.status === 401 || res.status === 429) {
      await new Promise(r => setTimeout(r, 200 + Math.random()*400))
      continue
    }
    throw new Error(`${res.status} ${res.statusText}`)
  }
  throw new Error('Falha após tentativas')
}

// Hook para buscar pacientes
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, sessionReady } = useAuth()

  useEffect(() => {
    if (!sessionReady) return
    const fetchPatients = async () => {
      try {
        setLoading(true)
        console.log('🔄 usePatients - Iniciando busca de pacientes no Supabase...')
        if (!user?.id) {
          console.log('👤 usePatients - Usuário não autenticado, retornando lista vazia')
          setPatients([])
          return
        }
        const d = await fetchJSON(`/api/patients?page=1&limit=100`)
        console.log('✅ usePatients - Pacientes via API:', d?.patients?.length || 0)
        setPatients(d?.patients || [])
      } catch (err) {
        console.error('❌ usePatients - Erro:', err)
        setError(err instanceof Error ? err.message : 'Erro ao buscar pacientes')
        setPatients([])
      } finally {
        setLoading(false)
        console.log('✅ usePatients - Busca finalizada, loading:', false)
      }
    }

    fetchPatients()
  }, [user?.id, sessionReady])

  const addPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('🔄 usePatients - Adicionando paciente no Supabase:', patientData)
      
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { data, error: supabaseError } = await supabase
        .from('patients')
        .insert([{
          ...patientData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()

      if (supabaseError) {
        console.error('❌ usePatients - Erro ao salvar no Supabase:', supabaseError)
        throw supabaseError
      }

      if (data && data[0]) {
        console.log('✅ usePatients - Paciente salvo no Supabase:', data[0])
        setPatients(prev => [data[0], ...prev])
        return data[0]
      }

      throw new Error('Falha ao salvar paciente no Supabase')
    } catch (err) {
      console.error('❌ usePatients - Erro ao adicionar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao adicionar paciente')
      throw err
    }
  }

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      console.log('🔄 usePatients - Atualizando paciente no Supabase:', { id, updates })
      
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { data, error: supabaseError } = await supabase
        .from('patients')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (supabaseError) {
        console.error('❌ usePatients - Erro ao atualizar no Supabase:', supabaseError)
        throw supabaseError
      }

      if (data && data[0]) {
        console.log('✅ usePatients - Paciente atualizado no Supabase:', data[0])
        setPatients(prev => prev.map(p => p.id === id ? data[0] : p))
        return data[0]
      }

      throw new Error('Falha ao atualizar paciente no Supabase')
    } catch (err) {
      console.error('❌ usePatients - Erro ao atualizar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar paciente')
      throw err
    }
  }

  const deletePatient = async (id: string) => {
    try {
      console.log('🔄 usePatients - Deletando paciente do Supabase:', id)
      
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { error: supabaseError } = await supabase
        .from('patients')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        console.error('❌ usePatients - Erro ao deletar do Supabase:', supabaseError)
        throw supabaseError
      }

      console.log('✅ usePatients - Paciente deletado do Supabase')
      setPatients(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('❌ usePatients - Erro ao deletar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao deletar paciente')
      throw err
    }
  }

  return {
    patients,
    loading,
    error,
    addPatient,
    updatePatient,
    deletePatient
  }
}

// Hook para buscar consultas
export function useConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, sessionReady } = useAuth()

  useEffect(() => {
    if (!sessionReady) return
    console.log('🔄 useConsultations - useEffect executado')
    const fetchConsultations = async () => {
      try {
        setLoading(true)
        console.log('🔄 useConsultations - Iniciando busca de consultas no Supabase...')
        if (!user?.id) {
          console.log('👤 useConsultations - Usuário não autenticado, retornando lista vazia')
          setConsultations([])
          return
        }
        const d = await fetchJSON(`/api/consultations`)
        console.log('✅ useConsultations - Consultas via API:', d?.consultations?.length || 0)
        setConsultations(d?.consultations || [])
      } catch (err) {
        console.error('❌ useConsultations - Erro:', err)
        setError(err instanceof Error ? err.message : 'Erro ao buscar consultas')
        setConsultations([])
      } finally {
        setLoading(false)
        console.log('✅ useConsultations - Busca finalizada, loading:', false)
      }
    }

    fetchConsultations()
  }, [user?.id, sessionReady])

  // Log quando o estado muda
  useEffect(() => {
    console.log('📊 useConsultations - Estado mudou:', {
      loading,
      error,
      count: consultations.length,
      data: consultations
    })
  }, [loading, error, consultations])

  const addConsultation = async (consultationData: Omit<Consultation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('🔄 useConsultations - Adicionando consulta no Supabase:', consultationData)
      
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { data, error: supabaseError } = await supabase
        .from('consultations')
        .insert([{
          ...consultationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()

      if (supabaseError) {
        console.error('❌ useConsultations - Erro ao salvar no Supabase:', supabaseError)
        throw supabaseError
      }

      if (data && data[0]) {
        console.log('✅ useConsultations - Consulta salva no Supabase:', data[0])
        setConsultations(prev => [data[0], ...prev])
        return data[0]
      }

      throw new Error('Falha ao salvar consulta no Supabase')
    } catch (err) {
      console.error('❌ useConsultations - Erro ao adicionar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao adicionar consulta')
      throw err
    }
  }

  const updateConsultation = async (id: string, updates: Partial<Consultation>) => {
    try {
      console.log('🔄 useConsultations - Atualizando consulta no Supabase:', { id, updates })
      
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { data, error: supabaseError } = await supabase
        .from('consultations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (supabaseError) {
        console.error('❌ useConsultations - Erro ao atualizar no Supabase:', supabaseError)
        throw supabaseError
      }

      if (data && data[0]) {
        console.log('✅ useConsultations - Consulta atualizada no Supabase:', data[0])
        setConsultations(prev => prev.map(c => c.id === id ? data[0] : c))
        return data[0]
      }

      throw new Error('Falha ao atualizar consulta no Supabase')
    } catch (err) {
      console.error('❌ useConsultations - Erro ao atualizar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar consulta')
      throw err
    }
  }

  const deleteConsultation = async (id: string) => {
    try {
      console.log('🔄 useConsultations - Deletando consulta do Supabase:', id)
      
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { error: supabaseError } = await supabase
        .from('consultations')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        console.error('❌ useConsultations - Erro ao deletar do Supabase:', supabaseError)
        throw supabaseError
      }

      console.log('✅ useConsultations - Consulta deletada do Supabase')
      setConsultations(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('❌ useConsultations - Erro ao deletar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao deletar consulta')
      throw err
    }
  }

  // Função para forçar recarregamento
  const refreshConsultations = useCallback(async () => {
    console.log('🔄 useConsultations - Forçando recarregamento do Supabase...')
    setLoading(true)
    setError(null)
    
    try {
      const d = await fetchJSON(`/api/consultations`)
      console.log('✅ useConsultations - Recarregado via API:', d?.consultations?.length || 0)
      setConsultations(d?.consultations || [])
    } catch (err) {
      console.error('❌ useConsultations - Erro no recarregamento:', err)
      setError(err instanceof Error ? err.message : 'Erro ao recarregar consultas')
      setConsultations([])
    } finally {
      setLoading(false)
      console.log('✅ useConsultations - Recarregamento finalizado')
    }
  }, [])

  return {
    consultations,
    loading,
    error,
    addConsultation,
    updateConsultation,
    deleteConsultation,
    refreshConsultations
  }
}

// Hook para buscar estatísticas
export function useStats() {
  const { consultations, loading: consultationsLoading } = useConsultations()
  const { patients, loading: patientsLoading } = usePatients()
  const [stats, setStats] = useState({ totalConsultations: 0, totalPatients: 0, todayConsultations: 0, productivity: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const todayCount = consultations.filter(c => {
      const d = c.created_at ? new Date(c.created_at) : null
      return d && d >= today
    }).length
    const completed = consultations.filter(c => c.status === 'COMPLETED').length
    const total = consultations.length
    const productivity = total > 0 ? Math.round((completed / total) * 100) : 0
    setStats({ totalConsultations: total, totalPatients: patients.length, todayConsultations: todayCount, productivity })
    setLoading(consultationsLoading || patientsLoading)
  }, [consultations, patients, consultationsLoading, patientsLoading])

  return { stats, loading }
}
