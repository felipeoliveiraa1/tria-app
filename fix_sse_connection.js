const fs = require('fs');

// Ler o arquivo
let content = fs.readFileSync('src/components/recording/hooks/use-dual-livekit-stt.ts', 'utf8');

// Mover configuração do SSE para dentro do evento Connected
content = content.replace(
  `        // Atualizar lista de participantes
        setParticipants(['doctor', 'patient'])
      })`,
  `        // Atualizar lista de participantes
        setParticipants(['doctor', 'patient'])
        
        // Configurar SSE após conectar ao LiveKit
        console.log('🔄 Configurando SSE após conexão LiveKit...')
        const eventSource = new EventSource(
          \`/api/transcriptions/stream?consultationId=\${config.consultationId}\`
        )
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          console.log('✅ Conectado ao stream de transcrições')
          console.log('🔗 SSE URL:', eventSource.url)
          console.log('🔗 SSE readyState:', eventSource.readyState)
        }

        eventSource.onmessage = (event) => {
          console.log('📨 Mensagem SSE recebida:', event.data)
          try {
            const data = JSON.parse(event.data)
            console.log('📨 Dados SSE parseados:', data)
            
            if (data.type === 'transcription') {
              console.log('📨 Transcrição recebida via SSE:', data)
              console.log('🏪 Debug addFinalSegment:', data.text, data.speaker)
              
              // Atualizar UI em tempo real com informação do speaker
              addFinalSegment({
                text: data.text,
                startMs: data.timestamp - 3000,
                endMs: data.timestamp,
                confidence: data.confidence || 0.8,
                isPartial: false,
                speaker: data.speaker // Incluir informação do speaker
              })
            }
          } catch (error) {
            console.warn('⚠️ Erro ao processar mensagem SSE:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('❌ Erro no stream de transcrições:', error)
          console.error('❌ SSE readyState:', eventSource.readyState)
          console.error('❌ SSE url:', eventSource.url)
          // Tentar reconectar após 5 segundos
          if (!isReconnectingRef.current) {
            isReconnectingRef.current = true
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Tentando reconectar stream de transcrições...')
              if (eventSourceRef.current) {
                eventSourceRef.current.close()
              }
              // Reconectar
              const newEventSource = new EventSource(
                \`/api/transcriptions/stream?consultationId=\${config.consultationId}\`
              )
              eventSourceRef.current = newEventSource
              isReconnectingRef.current = false
            }, 5000)
          }
        }
      })`
);

// Remover a configuração duplicada do SSE que está fora do evento
content = content.replace(
  `      // 3. Conectar ao stream de transcrições em tempo real
      console.log('🔄 Configurando stream de transcrições...')
      
      const eventSource = new EventSource(
        \`/api/transcriptions/stream?consultationId=\${config.consultationId}\`
      )
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('✅ Conectado ao stream de transcrições')
        console.log('🔗 SSE URL:', eventSource.url)
        console.log('🔗 SSE readyState:', eventSource.readyState)
      }

      eventSource.onmessage = (event) => {
        console.log('📨 Mensagem SSE recebida:', event.data)
        try {
          const data = JSON.parse(event.data)
          console.log('📨 Dados SSE parseados:', data)
          
          if (data.type === 'transcription') {
            console.log('📨 Transcrição recebida via SSE:', data)
            console.log('🏪 Debug addFinalSegment:', data.text, data.speaker)
            
            // Atualizar UI em tempo real com informação do speaker
            addFinalSegment({
              text: data.text,
              startMs: data.timestamp - 3000,
              endMs: data.timestamp,
              confidence: data.confidence || 0.8,
              isPartial: false,
              speaker: data.speaker // Incluir informação do speaker
            })
          }
        } catch (error) {
          console.warn('⚠️ Erro ao processar mensagem SSE:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ Erro no stream de transcrições:', error)
        console.error('❌ SSE readyState:', eventSource.readyState)
        console.error('❌ SSE url:', eventSource.url)
        // Tentar reconectar após 5 segundos
        if (!isReconnectingRef.current) {
          isReconnectingRef.current = true
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Tentando reconectar stream de transcrições...')
            if (eventSourceRef.current) {
              eventSourceRef.current.close()
            }
            // Reconectar
            const newEventSource = new EventSource(
              \`/api/transcriptions/stream?consultationId=\${config.consultationId}\`
            )
            eventSourceRef.current = newEventSource
            isReconnectingRef.current = false
          }, 5000)
        }
      }`,
  '      // 3. SSE será configurado após conectar ao LiveKit'
);

// Salvar o arquivo
fs.writeFileSync('src/components/recording/hooks/use-dual-livekit-stt.ts', content);

console.log('✅ SSE movido para dentro do evento Connected');
