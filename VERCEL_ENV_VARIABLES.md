# 🔧 Variáveis de Ambiente para Vercel

## 📋 Lista Completa de Variáveis

Copie e cole estas variáveis no dashboard da Vercel (Settings > Environment Variables):

### ✅ Supabase (Obrigatório)
```
NEXT_PUBLIC_SUPABASE_URL=https://hsefijaswekywdezexto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZWZpamFzd2VreXdkZXpleHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTI4NDksImV4cCI6MjA3MDYyODg0OX0.FZq-tvno9KrQTc0E5zy-xtj4fIR9Um6l3N2UJ5fPEc0
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### ✅ LiveKit (Obrigatório)
```
LIVEKIT_API_KEY=APIDn9LxXMp8yLW
LIVEKIT_API_SECRET=r86qWtRNCCS81UY1lHfuMmYV3tLKCVaEmweFDb9Kdo3
NEXT_PUBLIC_LIVEKIT_URL=wss://medtutor-5b3jl6hp.livekit.cloud
```

### 🔧 OpenAI (Opcional - para transcrição real)
```
OPENAI_API_KEY=your_openai_api_key_here
```

## 🚀 Como Configurar na Vercel

1. **Acesse o dashboard da Vercel**
2. **Vá em Settings > Environment Variables**
3. **Adicione cada variável acima**
4. **Marque todas as opções**: Production, Preview e Development
5. **Clique em "Save"**
6. **Faça um novo deploy**

## ⚠️ Importante

- **SUPABASE_SERVICE_ROLE_KEY**: Substitua `your_supabase_service_role_key_here` pela chave real do Supabase
- **OPENAI_API_KEY**: Substitua `your_openai_api_key_here` pela chave real da OpenAI (opcional)
- **Todas as outras variáveis** já estão com os valores corretos

## 🔍 Verificação

Após configurar, você deve ver nos logs da Vercel:
```
🔍 Verificando variáveis LiveKit:
🔍 LIVEKIT_API_KEY: ✅ Configurada
🔍 LIVEKIT_API_SECRET: ✅ Configurada
✅ Token LiveKit gerado com sucesso
```
