# =====================================================
# CONFIGURAÇÃO DE AMBIENTE PARA TRIA APP
# =====================================================

## 📁 Arquivo .env.local

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```bash
# =====================================================
# CONFIGURAÇÃO DO SUPABASE PARA TRIA APP
# =====================================================

# URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave de serviço do Supabase (para operações do servidor)
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Chave anônima do Supabase (para operações do cliente)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui

# =====================================================
# CONFIGURAÇÃO DA OPENAI (OPCIONAL)
# =====================================================

# Chave da API OpenAI para transcrições com Whisper
OPENAI_API_KEY=sk-proj-sua_chave_openai_aqui

# =====================================================
# CONFIGURAÇÃO DE STORAGE (OPCIONAL)
# =====================================================

# Bucket para arquivos de áudio
NEXT_PUBLIC_AUDIO_BUCKET=audio-files

# Bucket para documentos
NEXT_PUBLIC_DOCUMENTS_BUCKET=documents

# =====================================================
# CONFIGURAÇÃO DE DESENVOLVIMENTO
# =====================================================

# Modo de desenvolvimento (true = usar dados mock, false = usar Supabase)
NEXT_PUBLIC_USE_MOCK_DATA=true
```

## 🚀 Passos para Configuração

### 1. Configurar Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá para Settings > API
4. Copie a URL e as chaves para o `.env.local`

### 2. Executar SQL de Configuração
1. Vá para SQL Editor no painel do Supabase
2. Execute o conteúdo do arquivo `SUPABASE_SETUP.sql`
3. Verifique se todas as tabelas foram criadas

### 3. Configurar Storage
1. Vá para Storage no painel do Supabase
2. Crie os buckets:
   - `audio-files` (privado)
   - `documents` (privado)
3. Configure as políticas de acesso

### 4. Configurar RLS
1. Verifique se as políticas RLS estão ativas
2. Teste o acesso com um usuário autenticado

## 🔧 Configuração de Desenvolvimento

Para desenvolvimento, mantenha:
```bash
NEXT_PUBLIC_USE_MOCK_DATA=true
```

Isso permite que o sistema funcione sem configuração externa.

## 🚀 Configuração de Produção

Para produção, configure:
```bash
NEXT_PUBLIC_USE_MOCK_DATA=false
```

E preencha todas as variáveis do Supabase e OpenAI.

## ✅ Verificação da Configuração

Após configurar, teste:

1. **API de consultas**: `GET /api/consultations`
2. **API de transcrições**: `GET /api/transcriptions`
3. **API de arquivos de áudio**: `GET /api/audio-files`
4. **Criação de consulta**: `POST /api/consultations`
5. **Modal de ficha técnica**: Clique no olho em um paciente

## 🆘 Solução de Problemas

### Erro de conexão com Supabase
- Verifique as variáveis de ambiente
- Confirme se o projeto está ativo
- Teste a conexão no painel do Supabase

### Erro de RLS
- Verifique se as políticas estão ativas
- Confirme se o usuário está autenticado
- Teste as políticas individualmente

### Erro de storage
- Verifique se os buckets existem
- Confirme as políticas de acesso
- Teste o upload de arquivos

## 📞 Suporte

Para suporte técnico:
1. Verifique os logs no console
2. Teste as APIs individualmente
3. Consulte a documentação do Supabase
4. Entre em contato com a equipe de desenvolvimento
