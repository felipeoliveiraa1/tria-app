# 🧪 Guia de Teste - Sistema de Anamnese

## 📋 Pré-requisitos

1. **Navegador**: Chrome ou Edge (melhor suporte para Web Speech API)
2. **Microfone**: Permitir acesso ao microfone quando solicitado
3. **Banco de dados**: Executar a migração SQL antes de testar

### 1. Aplicar Migração do Banco

Execute o script SQL no seu banco Supabase:

```sql
-- Adicionar coluna anamnese à tabela consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS anamnese JSONB;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_consultations_anamnese ON consultations USING GIN (anamnese);

-- Comentário para documentar o campo
COMMENT ON COLUMN consultations.anamnese IS 'Dados da anamnese médica em formato JSON contendo perguntas e respostas organizadas por seções';
```

## 🚀 Passos para Testar

### Passo 1: Iniciar o Sistema
```bash
npm run dev
```

### Passo 2: Acessar o Dashboard
1. Acesse `http://localhost:3000`
2. Faça login no sistema
3. Vá para o Dashboard principal

### Passo 3: Criar uma Nova Consulta
1. No dashboard, clique em **"Nova Consulta"**
2. Selecione um paciente existente (ou crie um novo)
3. Escolha modalidade (Presencial ou Telemedicina)
4. Preencha o contexto do paciente (opcional)
5. Selecione o microfone
6. Marque o consentimento
7. Clique em **"Gravar consulta"**

**🎯 IMPORTANTE**: Isso vai te levar para a página de gravação onde a anamnese aparece!

### Passo 4: Testar a Anamnese

#### 4.1 Interface Visual
✅ **Verificar se aparece:**
- Sidebar à esquerda com perguntas organizadas por seções
- Área principal à direita com controles de gravação
- Perguntas agrupadas por: Identificação, QP, HMA, AP, AF, IDA

#### 4.2 Navegação nas Perguntas
✅ **Testar:**
- Clicar em diferentes perguntas na sidebar
- Verificar se a pergunta atual é destacada
- Confirmar que o contador mostra "X de Y perguntas"

#### 4.3 Transcrição de Voz
✅ **Testar Web Speech API:**
1. Clique em **"🎙️ Iniciar"** ao lado de uma pergunta
2. Fale uma resposta em português (ex: "Meu nome é João Silva")
3. Clique em **"⏹️ Parar"**
4. Verificar se o texto aparece no campo de resposta
5. Clicar **"Confirmar"** para salvar

#### 4.4 Edição Manual
✅ **Testar digitação:**
1. Digite uma resposta diretamente no campo de texto
2. Clique **"Confirmar"** para salvar
3. Verificar se a bolinha fica verde (pergunta respondida)

#### 4.5 Persistência Local
✅ **Testar localStorage:**
1. Responda algumas perguntas
2. Recarregue a página (F5)
3. Verificar se as respostas foram mantidas

#### 4.6 Salvamento Remoto
✅ **Testar autosave:**
1. Com consulta ativa, responda perguntas
2. Abra Developer Tools > Network
3. Verificar se chamadas PUT são feitas para `/api/consultations`
4. Verificar se campo `anamnese` está sendo enviado

## 🔍 Pontos de Verificação

### Interface
- [ ] Sidebar fixa aparece corretamente
- [ ] Perguntas organizadas por seções
- [ ] Navegação entre perguntas funciona
- [ ] Indicadores visuais (bolinhas) funcionam
- [ ] Layout responsivo (teste em mobile)

### Funcionalidade
- [ ] Web Speech API funciona (Chrome/Edge)
- [ ] Transcrição em português brasileiro
- [ ] Edição manual funciona
- [ ] Botão "Confirmar" salva resposta
- [ ] Botão "Limpar" remove resposta
- [ ] Avanço automático após confirmação

### Persistência
- [ ] Rascunho salvo no localStorage
- [ ] Dados mantidos após recarregar página
- [ ] Salvamento remoto via API (se consultationId presente)
- [ ] Dados salvos no banco (campo anamnese)

### Performance
- [ ] Interface responsiva
- [ ] Navegação suave entre perguntas
- [ ] Transcrição em tempo real funciona
- [ ] Sem travamentos ou erros no console

## 🐛 Solução de Problemas

### Problema: Web Speech API não funciona
**Soluções:**
- Use Chrome ou Edge
- Verifique se microfone está permitido
- Teste em HTTPS (produção)
- Fallback: use edição manual

### Problema: Dados não salvam
**Verificar:**
- Console do navegador para erros
- Network tab para chamadas API
- Se campo `anamnese` foi adicionado ao banco
- Se usuário está autenticado

### Problema: Interface quebrada
**Verificar:**
- Se imports estão corretos
- Se componentes foram criados nos caminhos certos
- Console para erros TypeScript/React

## 📊 Dados de Teste

### Respostas Exemplo para Testar:

**Identificação:**
- Nome: "João Silva Santos"
- Idade: "45 anos"
- Sexo: "Masculino"

**Queixa Principal:**
- Queixa: "Dor de cabeça forte"
- Tempo: "Há três dias"

**HMA:**
- Início: "Começou na segunda-feira de manhã"
- Instalação: "De forma súbita, após estresse no trabalho"

## 🎯 Critérios de Sucesso

✅ **Teste bem-sucedido se:**
1. Interface carrega sem erros
2. Todas as 6 seções aparecem na sidebar
3. Transcrição de voz funciona (Chrome/Edge)
4. Edição manual funciona
5. Navegação entre perguntas é fluida
6. Dados persistem localmente
7. Dados salvam no banco (se conectado)
8. Indicadores visuais funcionam
9. Layout é responsivo
10. Performance é aceitável

## 📝 Relatório de Teste

Após os testes, anote:
- ✅ O que funcionou
- ❌ O que não funcionou  
- 🐛 Bugs encontrados
- 💡 Melhorias sugeridas

---

**Dica**: Comece testando no Chrome com microfone para melhor experiência!
