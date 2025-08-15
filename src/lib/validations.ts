import { z } from 'zod'

export const newAppointmentSchema = z.object({
  mode: z.enum(['presencial', 'telemedicina']).optional(),
  patientId: z.string().min(1, 'Selecione um paciente').optional(),
  context: z.string().optional(),
  deviceId: z.string().min(1, 'Selecione um microfone').optional(),
  sampleRate: z.number().min(8000).optional(),
  consent: z.boolean().optional(),
})

export type NewAppointmentFormData = z.infer<typeof newAppointmentSchema>

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres')
})

export type LoginFormData = z.infer<typeof loginSchema>
