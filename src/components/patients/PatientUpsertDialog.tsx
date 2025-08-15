import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, Button } from '@/components/ui/dialog'

type AnyPatientFormData = {
  id?: string
  name: string
  email?: string
  phone?: string
  city?: string
  status?: 'active' | 'inactive'
  [key: string]: any
}

interface Props {
  open: boolean
  onOpenChange?: (open:boolean)=>void
  patient?: AnyPatientFormData | null
  initialData?: AnyPatientFormData | null
  onSubmit: (data: any) => any
}

export const PatientUpsertDialog: React.FC<Props> = ({ open, patient, initialData, onSubmit }) => {
  const [form, setForm] = React.useState<AnyPatientFormData>(initialData || patient || { name: '', status: 'active' })
  React.useEffect(()=>{ setForm(initialData || patient || { name: '', status: 'active' }) }, [patient, initialData])
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{(initialData || patient) ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <DialogDescription>Preencha os dados do paciente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <input className="w-full border rounded p-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className="w-full border rounded p-2" placeholder="Email" value={form.email||''} onChange={e=>setForm({...form, email:e.target.value})} />
          <input className="w-full border rounded p-2" placeholder="Telefone" value={form.phone||''} onChange={e=>setForm({...form, phone:e.target.value})} />
          <input className="w-full border rounded p-2" placeholder="Cidade" value={form.city||''} onChange={e=>setForm({...form, city:e.target.value})} />
        </div>
        <DialogFooter>
          <Button onClick={()=>onSubmit(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
