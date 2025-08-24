'use client';

import React from 'react';
import { AnamneseState, Field } from '@/lib/anamnese-schema';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Edit } from 'lucide-react';
import './anamnese-paper.css';

interface AnamneseViewerProps {
  anamnese: AnamneseState;
  onFieldClick?: (sectionKey: string, fieldKey: string, field: Field) => void;
}

interface FieldProps {
  label: string;
  field: Field;
  sectionKey: string;
  fieldKey: string;
  onFieldClick?: (sectionKey: string, fieldKey: string, field: Field) => void;
  placeholder?: string;
  fieldType?: 'short' | 'medium' | 'long' | 'textarea';
}

function FieldInput({ 
  label, 
  field, 
  sectionKey, 
  fieldKey, 
  onFieldClick, 
  placeholder = "",
  fieldType = 'medium'
}: FieldProps) {
  const hasValue = field.value !== null && field.value !== '';
  const confidence = field.confidence || 0;
  const isConfirmed = field.confirmed;

  const getFieldClass = () => {
    let baseClass = "anamnese-field";
    
    if (fieldType === 'short') baseClass += " field-short";
    else if (fieldType === 'long') baseClass += " field-long";
    else if (fieldType === 'textarea') baseClass += " field-textarea";
    else baseClass += " field-medium";

    if (hasValue) {
      if (isConfirmed) baseClass += " field-confirmed";
      else if (confidence >= 0.6) baseClass += " field-high-confidence";
      else if (confidence >= 0.4) baseClass += " field-medium-confidence";
      else baseClass += " field-low-confidence";
    } else {
      baseClass += " field-empty";
    }

    return baseClass;
  };

  return (
    <div className="anamnese-field-container">
      <label className="anamnese-label">{label}:</label>
      <div 
        className={getFieldClass()}
        onClick={() => onFieldClick?.(sectionKey, fieldKey, field)}
      >
        {hasValue ? (
          <div className="field-content">
            <span className="field-value">{String(field.value)}</span>
            <div className="field-indicators">
              {isConfirmed && <CheckCircle className="confirmed-icon" />}
              {!isConfirmed && confidence > 0 && (
                <Badge variant={confidence >= 0.6 ? "default" : confidence >= 0.4 ? "secondary" : "destructive"} className="confidence-badge">
                  {Math.round(confidence * 100)}%
                </Badge>
              )}
              {onFieldClick && <Edit className="edit-icon" />}
            </div>
          </div>
        ) : (
          <span className="field-placeholder">{placeholder}</span>
        )}
      </div>
    </div>
  );
}

function AnamneseSection({ 
  title, 
  children, 
  className = "" 
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`anamnese-section ${className}`}>
      <h3 className="section-title">{title}</h3>
      <div className="section-content">
        {children}
      </div>
    </div>
  );
}

export function AnamneseViewer({ anamnese, onFieldClick }: AnamneseViewerProps) {
  const { identificacao, qp, hma, ap, af, ida } = anamnese;

  return (
    <div className="anamnese-paper">
      {/* Cabeçalho do documento */}
      <div className="paper-header">
        <h1 className="paper-title">ANAMNESE MÉDICA</h1>
        <div className="paper-subtitle">
          <div>Data: ___/___/______</div>
          <div>Médico(a): _________________________</div>
        </div>
      </div>

      {/* Identificação do Paciente */}
      <AnamneseSection title="I. IDENTIFICAÇÃO DO PACIENTE">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldInput
            label="Nome completo"
            field={identificacao.nome_completo}
            sectionKey="identificacao"
            fieldKey="nome_completo"
            onFieldClick={onFieldClick}
            fieldType="long"
            placeholder="Nome completo do paciente"
          />
          <div className="flex gap-4">
            <FieldInput
              label="Idade"
              field={identificacao.idade}
              sectionKey="identificacao"
              fieldKey="idade"
              onFieldClick={onFieldClick}
              fieldType="short"
              placeholder="__ anos"
            />
            <FieldInput
              label="Sexo"
              field={identificacao.sexo}
              sectionKey="identificacao"
              fieldKey="sexo"
              onFieldClick={onFieldClick}
              fieldType="short"
              placeholder="M/F"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FieldInput
            label="Cor/Raça"
            field={identificacao.cor_raca}
            sectionKey="identificacao"
            fieldKey="cor_raca"
            onFieldClick={onFieldClick}
            placeholder="Cor/raça autodeclarada"
          />
          <FieldInput
            label="Estado Civil"
            field={identificacao.estado_civil}
            sectionKey="identificacao"
            fieldKey="estado_civil"
            onFieldClick={onFieldClick}
            placeholder="Solteiro(a)/Casado(a)/etc"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FieldInput
            label="Profissão"
            field={identificacao.profissao}
            sectionKey="identificacao"
            fieldKey="profissao"
            onFieldClick={onFieldClick}
            placeholder="Ocupação profissional"
          />
          <FieldInput
            label="Naturalidade"
            field={identificacao.nacionalidade_naturalidade}
            sectionKey="identificacao"
            fieldKey="nacionalidade_naturalidade"
            onFieldClick={onFieldClick}
            placeholder="Cidade/Estado de nascimento"
          />
        </div>

        <div className="mt-4">
          <FieldInput
            label="Endereço/Procedência"
            field={identificacao.onde_mora}
            sectionKey="identificacao"
            fieldKey="onde_mora"
            onFieldClick={onFieldClick}
            fieldType="long"
            placeholder="Endereço completo ou cidade de origem"
          />
        </div>
      </AnamneseSection>

      {/* Queixa Principal */}
      <AnamneseSection title="II. QUEIXA PRINCIPAL (QP)">
        <FieldInput
          label="Queixa principal"
          field={qp.queixa}
          sectionKey="qp"
          fieldKey="queixa"
          onFieldClick={onFieldClick}
          fieldType="textarea"
          placeholder="Motivo da consulta, nas palavras do paciente"
        />
        
        <div className="mt-4">
          <FieldInput
            label="Tempo de evolução"
            field={qp.tempo}
            sectionKey="qp"
            fieldKey="tempo"
            onFieldClick={onFieldClick}
            placeholder="Há quanto tempo iniciaram os sintomas"
          />
        </div>
      </AnamneseSection>

      {/* História da Moléstia Atual */}
      <AnamneseSection title="III. HISTÓRIA DA MOLÉSTIA ATUAL (HMA)">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldInput
              label="Início dos sintomas"
              field={hma.inicio}
              sectionKey="hma"
              fieldKey="inicio"
              onFieldClick={onFieldClick}
              placeholder="Como e quando começou"
            />
            <FieldInput
              label="Instalação"
              field={hma.instalacao}
              sectionKey="hma"
              fieldKey="instalacao"
              onFieldClick={onFieldClick}
              placeholder="Súbita/gradual/progressiva"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldInput
              label="Localização"
              field={hma.localizacao}
              sectionKey="hma"
              fieldKey="localizacao"
              onFieldClick={onFieldClick}
              placeholder="Onde se localizam os sintomas"
            />
            <FieldInput
              label="Qualidade/Características"
              field={hma.qualidade}
              sectionKey="hma"
              fieldKey="qualidade"
              onFieldClick={onFieldClick}
              placeholder="Tipo de dor/sintoma"
            />
          </div>

          <FieldInput
            label="Frequência e Intensidade"
            field={hma.freq_intensidade}
            sectionKey="hma"
            fieldKey="freq_intensidade"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Com que frequência ocorre e intensidade (escala 0-10)"
          />

          <FieldInput
            label="Fatores Moduladores"
            field={hma.fatores}
            sectionKey="hma"
            fieldKey="fatores"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="O que melhora ou piora os sintomas"
          />

          <FieldInput
            label="Fatores Desencadeantes"
            field={hma.desencadeia}
            sectionKey="hma"
            fieldKey="desencadeia"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="O que provoca ou desencadeia os sintomas"
          />

          <FieldInput
            label="Sintomas Associados"
            field={hma.associados}
            sectionKey="hma"
            fieldKey="associados"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Outros sintomas que acompanham a queixa principal"
          />

          <FieldInput
            label="Episódios Prévios"
            field={hma.previos}
            sectionKey="hma"
            fieldKey="previos"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Episódios similares anteriores"
          />
        </div>
      </AnamneseSection>

      {/* Antecedentes Pessoais */}
      <AnamneseSection title="IV. ANTECEDENTES PESSOAIS (AP)">
        <div className="space-y-4">
          <FieldInput
            label="Nascimento e Desenvolvimento"
            field={ap.nascimento_desenvolvimento}
            sectionKey="ap"
            fieldKey="nascimento_desenvolvimento"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Condições do nascimento, desenvolvimento na infância"
          />

          <FieldInput
            label="Doenças Importantes"
            field={ap.doencas_importantes}
            sectionKey="ap"
            fieldKey="doencas_importantes"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Doenças prévias, diagnósticos anteriores"
          />

          <FieldInput
            label="Cirurgias, Hospitalizações e Exames"
            field={ap.cirurgias_hosp_exames}
            sectionKey="ap"
            fieldKey="cirurgias_hosp_exames"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Procedimentos, internações, exames relevantes"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldInput
              label="Acidentes e Traumas"
              field={ap.acidentes}
              sectionKey="ap"
              fieldKey="acidentes"
              onFieldClick={onFieldClick}
              placeholder="Acidentes, traumas, quedas"
            />
            <FieldInput
              label="Alergias"
              field={ap.alergias}
              sectionKey="ap"
              fieldKey="alergias"
              onFieldClick={onFieldClick}
              placeholder="Alergias medicamentosas ou outras"
            />
          </div>

          <FieldInput
            label="História Gineco-Obstétrica (se aplicável)"
            field={ap.mulher_gineco}
            sectionKey="ap"
            fieldKey="mulher_gineco"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Menarca, ciclo menstrual, gestações, partos"
          />

          <FieldInput
            label="Contexto Psicossocial"
            field={ap.contexto}
            sectionKey="ap"
            fieldKey="contexto"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Situação social, suporte familiar, trabalho"
          />

          <FieldInput
            label="Hábitos"
            field={ap.habitos}
            sectionKey="ap"
            fieldKey="habitos"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Tabagismo, etilismo, exercícios, alimentação"
          />

          <FieldInput
            label="Sono e Humor"
            field={ap.sono_humor}
            sectionKey="ap"
            fieldKey="sono_humor"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Padrão de sono, humor, estresse"
          />

          <FieldInput
            label="Medicamentos em Uso"
            field={ap.medicamentos}
            sectionKey="ap"
            fieldKey="medicamentos"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Medicamentos atuais, dosagem, tempo de uso"
          />
        </div>
      </AnamneseSection>

      {/* Antecedentes Familiares */}
      <AnamneseSection title="V. ANTECEDENTES FAMILIARES (AF)">
        <div className="space-y-4">
          <FieldInput
            label="Saúde da Família"
            field={af.saude_familia}
            sectionKey="af"
            fieldKey="saude_familia"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Doenças na família (pais, irmãos, avós)"
          />

          <FieldInput
            label="Casos Semelhantes na Família"
            field={af.semelhantes}
            sectionKey="af"
            fieldKey="semelhantes"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Familiares com sintomas ou doenças similares"
          />

          <FieldInput
            label="História de Repetição Familiar"
            field={af.hist_repeticao}
            sectionKey="af"
            fieldKey="hist_repeticao"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Doenças hereditárias, padrões familiares"
          />

          <FieldInput
            label="Óbitos na Família"
            field={af.obitos}
            sectionKey="af"
            fieldKey="obitos"
            onFieldClick={onFieldClick}
            fieldType="textarea"
            placeholder="Causas de morte de familiares próximos"
          />
        </div>
      </AnamneseSection>

      {/* Interrogatório dos Diversos Aparelhos */}
      <AnamneseSection title="VI. INTERROGATÓRIO DOS DIVERSOS APARELHOS (IDA)">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldInput
              label="Cabeça"
              field={ida.cabeca}
              sectionKey="ida"
              fieldKey="cabeca"
              onFieldClick={onFieldClick}
              placeholder="Cefaleias, tonturas"
            />
            <FieldInput
              label="Olhos"
              field={ida.olhos}
              sectionKey="ida"
              fieldKey="olhos"
              onFieldClick={onFieldClick}
              placeholder="Visão, dor ocular"
            />
            <FieldInput
              label="Ouvidos"
              field={ida.ouvidos}
              sectionKey="ida"
              fieldKey="ouvidos"
              onFieldClick={onFieldClick}
              placeholder="Audição, zumbido"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldInput
              label="Nariz"
              field={ida.nariz}
              sectionKey="ida"
              fieldKey="nariz"
              onFieldClick={onFieldClick}
              placeholder="Obstrução, secreção"
            />
            <FieldInput
              label="Boca e Garganta"
              field={ida.boca_garganta}
              sectionKey="ida"
              fieldKey="boca_garganta"
              onFieldClick={onFieldClick}
              placeholder="Dor de garganta, disfagia"
            />
            <FieldInput
              label="Cardiovascular/Pulmonar"
              field={ida.cardio_pulmonar}
              sectionKey="ida"
              fieldKey="cardio_pulmonar"
              onFieldClick={onFieldClick}
              placeholder="Dispneia, palpitações"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldInput
              label="Digestivo"
              field={ida.digestivo}
              sectionKey="ida"
              fieldKey="digestivo"
              onFieldClick={onFieldClick}
              placeholder="Náuseas, diarreia"
            />
            <FieldInput
              label="Urinário/Genital"
              field={ida.urinario_genital}
              sectionKey="ida"
              fieldKey="urinario_genital"
              onFieldClick={onFieldClick}
              placeholder="Disúria, urgência"
            />
            <FieldInput
              label="Neurológico"
              field={ida.neurologico}
              sectionKey="ida"
              fieldKey="neurologico"
              onFieldClick={onFieldClick}
              placeholder="Convulsões, paralisias"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldInput
              label="Musculoesquelético"
              field={ida.musculoesqueletico}
              sectionKey="ida"
              fieldKey="musculoesqueletico"
              onFieldClick={onFieldClick}
              placeholder="Dor articular, rigidez"
            />
            <FieldInput
              label="Endócrino"
              field={ida.endocrino}
              sectionKey="ida"
              fieldKey="endocrino"
              onFieldClick={onFieldClick}
              placeholder="Alterações hormonais"
            />
            <FieldInput
              label="Linfático"
              field={ida.linfatico}
              sectionKey="ida"
              fieldKey="linfatico"
              onFieldClick={onFieldClick}
              placeholder="Gânglios aumentados"
            />
          </div>
        </div>
      </AnamneseSection>

      {/* Rodapé do documento */}
      <div className="paper-footer">
        <div className="signature-section">
          <div className="signature-line">
            <span>Assinatura do Médico: _________________________________</span>
          </div>
          <div className="signature-line">
            <span>CRM: _________________ Data: ___/___/______</span>
          </div>
        </div>
      </div>
    </div>
  );
}