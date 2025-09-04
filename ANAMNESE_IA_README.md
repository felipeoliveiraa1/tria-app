# 🧠 Anamnese com IA - Implementação Completa

## 📋 Resumo da Implementação

Foi implementado um sistema completo de anamnese automática usando OpenAI Responses API com Structured Output. O sistema extrai informações de trechos de fala/texto e preenche automaticamente os campos da anamnese com níveis de confiança.

## 🏗️ Arquivos Criados

### 1. Schema e Utilitários Base
- **`src/lib/anamnese-schema.ts`** - Tipos, schema JSON e funções de merge
- **`src/lib/supabase-admin.ts`** - Cliente Supabase Admin para server-side
- **`src/lib/anamnese-client.ts`** - Utilitários client-side para chamar a API

### 2. API Backend
- **`src/app/api/anamnese/ingest/route.ts`** - Endpoint POST que processa texto com IA

### 3. Componentes React
- **`src/components/consultations/AnamneseViewer.tsx`** - Visualizador da anamnese
- **`src/components/consultations/AnamneseAIPanel.tsx`** - Painel completo com IA
- **`src/hooks/use-anamnese-ai.ts`** - Hook para gerenciar estado da anamnese

### 4. Página de Teste
- **`src/app/dashboard/test-anamnese/page.tsx`** - Página para testar a funcionalidade

## 🔧 Configuração Necessária

### Variáveis de Ambiente (.env.local)
```bash
# Supabase (já existentes)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI (nova)
OPENAI_API_KEY=your_openai_api_key_here
```

### Dependências Instaladas
- `openai` - SDK da OpenAI para Responses API

## 🎯 Como Usar

### 1. Acesse a Página de Teste
```
http://localhost:3000/dashboard/test-anamnese
```

### 2. Teste com Exemplos
Digite textos que simulem fala do paciente:

**Exemplo 1 - Identificação:**
```
"Meu nome é João Pereira, tenho 42 anos, sou masculino, moro em Barueri."
```

**Exemplo 2 - Queixa Principal:**
```
"Minha queixa principal é dor no peito há 3 dias, piora ao subir escada."
```

**Exemplo 3 - História da Moléstia Atual:**
```
"A dor começou de repente na segunda-feira, é como um aperto no peito, piora com esforço físico, melhora em repouso."
```

**Exemplo 4 - Antecedentes:**
```
"Já tive pressão alta, tomo losartana. Meu pai morreu de infarto. Sou fumante há 20 anos."
```

### 3. Integração com Componentes Existentes

Para usar em um componente de consulta existente:

```tsx
import { AnamneseAIPanel } from '@/components/consultations/AnamneseAIPanel';

function ConsultationPage({ consultationId }: { consultationId: string }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Sua gravação/transcrição existente */}
      <div>...</div>
      
      {/* Painel de Anamnese com IA */}
      <AnamneseAIPanel 
        consultationId={consultationId}
        onTranscriptReceived={(callback) => {
          // Registrar callback para receber transcrição em tempo real
          // Chame callback(text) sempre que houver novo texto transcrito
        }}
      />
    </div>
  );
}
```

## 🎨 Sistema de Cores

A confiança da IA é indicada por cores:

- **🔴 Cinza (< 40%)**: Baixa confiança, informação incerta
- **🟡 Amarelo (40-70%)**: Confiança moderada, pode precisar revisão
- **🟢 Verde (> 70%)**: Alta confiança, informação provável
- **🟢 Verde Escuro + ✓**: Campo confirmado manualmente pelo médico

## 🚀 Funcionalidades

### ✅ Extração Automática
- Processsa texto em tempo real
- Extrai informações por seção da anamnese
- Nivéis de confiança automáticos
- Preserva evidência textual

### ✅ Merge Inteligente
- Não sobrescreve campos confirmados
- Atualiza apenas com maior confiança
- Mantém histórico de alterações

### ✅ Edição Manual
- Clique em qualquer campo para editar
- Confirme campos importantes
- Ajuste níveis de confiança
- Adicione texto de evidência

### ✅ Persistência
- Auto-save no banco de dados
- Integração com tabela `consultations`
- Estado recuperável entre sessões

## 🧪 Teste da API Diretamente

```bash
curl -X POST http://localhost:3000/api/anamnese/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "consultationId": "test-id",
    "transcriptChunk": "Meu nome é João Silva, tenho 45 anos, minha queixa é dor de cabeça há 2 semanas"
  }'
```

## 🔄 Fluxo de Dados

1. **Entrada**: Texto transcrito ou digitado
2. **Processamento**: OpenAI Responses API com schema estruturado
3. **Merge**: Combina com estado atual preservando confirmações
4. **Visualização**: Componente atualiza com cores de confiança
5. **Persistência**: Salva no Supabase quando necessário

## 📊 Monitoramento

- Console logs para debugging
- Status visual de processamento
- Indicadores de alterações recentes
- Feedback de erros para o usuário

## 🎓 Próximos Passos

1. **Integrar com gravação**: Conectar com sistema de STT existente
2. **Melhorar prompts**: Ajustar prompts para casos específicos
3. **Validações médicas**: Adicionar validações clínicas
4. **Histórico de alterações**: Implementar auditoria completa
5. **Export/Import**: Permitir exportar anamnese em formatos padrão

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique as variáveis de ambiente
2. Confirme que a OpenAI API key está válida
3. Verifique os logs do console para erros
4. Teste a API diretamente via curl
5. Verifique se o Supabase está configurado corretamente













