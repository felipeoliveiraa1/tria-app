import { useState, useEffect, useCallback } from 'react'
import { supabase, Patient, Consultation, User } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

// Hook para buscar pacientes
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true)
        console.log('🔄 usePatients - Iniciando busca de pacientes no Supabase...')
        
        if (!supabase) {
          throw new Error('Supabase não está configurado')
        }
        if (!user?.id) {
          console.log('👤 usePatients - Usuário não autenticado, retornando lista vazia')
          setPatients([])
          return
        }

        const { data, error: supabaseError } = await supabase
          .from('patients')
          .select('*')
          .eq('doctor_id', user?.id || '')
          .order('created_at', { ascending: false })

        if (supabaseError) {
          console.error('❌ usePatients - Erro no Supabase:', supabaseError)
          throw supabaseError
        }

        console.log('✅ usePatients - Pacientes carregados do Supabase:', data?.length || 0, data)
        setPatients(data || [])
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
  }, [user?.id])

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
  const { user } = useAuth()

  useEffect(() => {
    console.log('🔄 useConsultations - useEffect executado')
    const fetchConsultations = async () => {
      try {
        setLoading(true)
        console.log('🔄 useConsultations - Iniciando busca de consultas no Supabase...')
        
        if (!supabase) {
          throw new Error('Supabase não está configurado')
        }
        if (!user?.id) {
          console.log('👤 useConsultations - Usuário não autenticado, retornando lista vazia')
          setConsultations([])
          return
        }

        const { data, error: supabaseError } = await supabase
          .from('consultations')
          .select('*')
          .eq('doctor_id', user?.id || '')
          .order('created_at', { ascending: false })

        if (supabaseError) {
          console.error('❌ useConsultations - Erro no Supabase:', supabaseError)
          throw supabaseError
        }

        console.log('✅ useConsultations - Consultas carregadas do Supabase:', data?.length || 0, data)
        setConsultations(data || [])
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
  }, [user?.id])

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
      if (!supabase) {
        throw new Error('Supabase não está configurado')
      }

      const { data, error: supabaseError } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('❌ useConsultations - Erro no recarregamento:', supabaseError)
        throw supabaseError
      }

      console.log('✅ useConsultations - Recarregamento do Supabase:', data?.length || 0, data)
      setConsultations(data || [])
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
  const [stats, setStats] = useState({
    totalConsultations: 0,
    totalPatients: 0,
    todayConsultations: 0,
    productivity: 0
  })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    // Se não houver usuário, finalize loading e mantenha zeros
    if (!user) {
      setStats({
        totalConsultations: 0,
        totalPatients: 0,
        todayConsultations: 0,
        productivity: 0
      })
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchStats = async () => {
      try {
        setLoading(true)
        
        // Buscar total de consultas
        const { count: totalConsultations } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', user.id)

        // Buscar total de pacientes
        const { count: totalPatients } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', user.id)

        // Buscar consultas de hoje
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayIso = today.toISOString()
        const { count: todayConsultations } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', user.id)
          // Compatível com schemas usando created_at OU scheduled_date
          .or(`created_at.gte.${todayIso},scheduled_date.gte.${todayIso}`)

        // Calcular produtividade (consultas concluídas / total)
        const { count: completedConsultations } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', user.id)
          .eq('status', 'COMPLETED')

        const totalAll = totalConsultations ?? 0
        const completedAll = completedConsultations ?? 0
        const productivity = totalAll > 0 
          ? Math.round((completedAll) / (totalAll) * 100)
          : 0

        if (!cancelled) {
          setStats({
            totalConsultations: totalAll,
            totalPatients: totalPatients ?? 0,
            todayConsultations: todayConsultations ?? 0,
            productivity
          })
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [user?.id])

  return { stats, loading }
}
