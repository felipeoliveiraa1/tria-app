-- Migração para adicionar campo anamnese à tabela consultations
-- Este script adiciona suporte para armazenar dados da anamnese em formato JSONB

-- Adicionar coluna anamnese à tabela consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS anamnese JSONB;

-- Criar índice para melhor performance nas consultas de anamnese
CREATE INDEX IF NOT EXISTS idx_consultations_anamnese ON consultations USING GIN (anamnese);

-- Comentário para documentar o campo
COMMENT ON COLUMN consultations.anamnese IS 'Dados da anamnese médica em formato JSON contendo perguntas e respostas organizadas por seções';

