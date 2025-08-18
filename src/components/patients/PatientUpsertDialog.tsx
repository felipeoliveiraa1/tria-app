import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

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

export const PatientUpsertDialog: React.FC<Props> = ({ open, onOpenChange, patient, initialData, onSubmit }) => {
  const [form, setForm] = React.useState<AnyPatientFormData>(initialData || patient || { name: '', status: 'active' })
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(()=>{ setForm(initialData || patient || { name: '', status: 'active' }) }, [patient, initialData])

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) {
      // Fixo: (11) 1234-5678
      const p1 = digits.slice(0, 2)
      const p2 = digits.slice(2, 6)
      const p3 = digits.slice(6, 10)
      return [
        p1 ? `(${p1}` : '',
        p1 && p1.length === 2 ? ') ' : '',
        p2,
        p3 ? `-${p3}` : ''
      ].join('')
    }
    // Celular: (11) 91234-5678
    const p1 = digits.slice(0, 2)
    const p2 = digits.slice(2, 7)
    const p3 = digits.slice(7, 11)
    return [
      p1 ? `(${p1}` : '',
      p1 && p1.length === 2 ? ') ' : '',
      p2,
      p3 ? `-${p3}` : ''
    ].join('')
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.name || form.name.trim().length < 2) next.name = 'Informe o nome completo'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email inválido'
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) next.phone = 'Telefone incompleto'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone || undefined,
        city: form.city?.trim() || undefined,
        status: (form.status as any) || 'active'
      }
      await onSubmit(payload)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] bg-card border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle>{(initialData || patient) ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <DialogDescription>Preencha os dados do paciente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome Completo *</label>
            <Input placeholder="Ex.: João da Silva" value={form.name}
              onChange={e=>setForm({...form, name:e.target.value})} className="mt-1" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="email@exemplo.com" value={form.email||''}
                onChange={e=>setForm({...form, email:e.target.value})} className="mt-1" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input placeholder="(11) 91234-5678" value={form.phone||''}
                onChange={e=>setForm({...form, phone: formatPhone(e.target.value)})} className="mt-1" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <Input placeholder="São Paulo" value={form.city||''}
                onChange={e=>setForm({...form, city:e.target.value})} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={(form.status as any) || 'active'} onValueChange={(v)=>setForm({...form, status: v as any})}>
                <SelectTrigger className="mt-1 w-full h-10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange?.(false)} className="mr-2">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
