import React from 'react'
import { Button } from '@/components/ui/button'

interface PatientFormData {
  name: string
  email: string
  phone: string
  city: string
  status: 'active' | 'inactive'
}

interface PatientModalProps {
  isOpen: boolean
  patient: any | null
  onSubmit: (data: PatientFormData) => void
  onCancel: () => void
}

export const PatientModal: React.FC<PatientModalProps> = ({ isOpen, onSubmit, onCancel }) => {
  const [form, setForm] = React.useState<PatientFormData>({ name: '', email: '', phone: '', city: '', status: 'active' })
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">Novo Paciente</h3>
        <input className="w-full border rounded p-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="w-full border rounded p-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="w-full border rounded p-2" placeholder="Telefone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
        <input className="w-full border rounded p-2" placeholder="Cidade" value={form.city} onChange={e=>setForm({...form, city:e.target.value})}/>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={()=>onSubmit(form)}>Salvar</Button>
        </div>
      </div>
    </div>
  )
}
