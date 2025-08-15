import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface PatientOption {
  id: string
  name: string
  email?: string
}

interface PatientComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  onNewPatient?: () => void
  disabled?: boolean
}

export const PatientCombobox: React.FC<PatientComboboxProps> = ({ value, onValueChange, onNewPatient, disabled }) => {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState<PatientOption[]>([])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPatients = async (q: string) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (q.trim()) params.set('search', q.trim())
      const res = await fetch(`/api/patients?${params.toString()}`)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }
      const data = await res.json()
      const list: PatientOption[] = (data.patients || []).map((p: any) => ({ id: p.id, name: p.name || p.full_name || p.email || p.id, email: p.email }))
      setPatients(list)
    } catch (e) {
      console.error('Erro ao buscar pacientes:', e)
      setError('Não foi possível carregar pacientes')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Carregar inicial
    fetchPatients('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPatients(search)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const selectedLabel = useMemo(() => patients.find(p => p.id === value)?.name || value || '', [patients, value])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled}
        />
        <Button type="button" variant="outline" onClick={onNewPatient} disabled={disabled}>
          Novo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value || ''}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="" disabled>{loading ? 'Carregando...' : 'Selecione um paciente'}</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.email ? `- ${p.email}` : ''}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !loading && patients.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
      )}
    </div>
  )
}
