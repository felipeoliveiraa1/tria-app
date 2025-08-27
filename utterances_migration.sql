-- Tabela para armazenar falas rotuladas (médico/paciente)
create table if not exists public.utterances (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  speaker text not null check (speaker in ('doctor','patient')),
  start_ms integer,
  end_ms integer,
  text text not null,
  confidence numeric,
  created_at timestamptz default now()
);

-- Índice para consultas otimizadas
create index if not exists utterances_consultation_idx
  on public.utterances(consultation_id, created_at);

-- Comentários para documentação
comment on table public.utterances is 'Armazena falas transcritas rotuladas por speaker (médico/paciente)';
comment on column public.utterances.speaker is 'Identifica quem falou: doctor ou patient';
comment on column public.utterances.start_ms is 'Timestamp de início da fala em millisegundos';
comment on column public.utterances.end_ms is 'Timestamp de fim da fala em millisegundos';
comment on column public.utterances.confidence is 'Confiança da transcrição (0.0 a 1.0)';

