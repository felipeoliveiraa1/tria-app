# Debug do Sistema VAD

## Como habilitar o debug

Para habilitar o overlay de debug do VAD, adicione a seguinte variável ao seu arquivo `.env.local`:

```
NEXT_PUBLIC_DEBUG_VAD=1
```

## O que o debug mostra

O overlay de debug exibe:

- **Estado ativo/inativo** de cada microfone (Doctor/Patient)
- **Valores RMS** em tempo real
- **Speaker atual** (quem está falando)
- **Floor hold** restante (tempo de "piso" para evitar troca rápida de falantes)

## Como funciona o novo sistema

### 1. Calibração Automática
- Sistema calibra ruído de fundo por 1.2 segundos
- Define thresholds dinâmicos baseados no ambiente
- Ajusta automaticamente para diferentes microfones

### 2. Detecção de Fala
- VAD com histerese (2 janelas para ativar, 5 para desativar)
- Pré-roll de 150ms para não cortar início das palavras
- Timeout de 400ms de silêncio para finalizar segmento

### 3. Critérios de Qualidade
- Duração mínima: 600ms
- Duração máxima: 12 segundos
- Speech ratio mínimo: 35%
- RMS mínimo: 0.008

### 4. Floor Control
- Hold de 900ms quando um falante está ativo
- Troca só ocorre se outro falante tiver RMS 1.9x maior por 220ms
- Evita "ping-pong" entre falantes

### 5. Filtros no Servidor
- Validação de RMS e speech ratio
- Filtros para conteúdo repetitivo
- Bloqueio de transcrições de vídeos/legendas

## Benefícios

✅ **Sem transcrições automáticas** - só transcreve fala real
✅ **Sem ruído de fundo** - AGC desabilitado
✅ **Sem eco** - floor control e correlação
✅ **Baixa latência** - segmentação inteligente
✅ **Alta qualidade** - múltiplas validações

