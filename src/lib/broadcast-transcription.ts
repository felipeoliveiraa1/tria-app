// Store global para conexões ativas (em produção, usar Redis)
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Função para broadcast de transcrições para todas as conexões de uma consulta
export function broadcastTranscription(consultationId: string, data: any) {
  console.log('📡 Broadcast iniciado para consulta:', consultationId, 'dados:', data)
  const connections = activeConnections.get(consultationId)
  console.log('🔗 Conexões ativas para', consultationId, ':', connections ? connections.size : 0)
  if (!connections) {
    console.warn('⚠️ Nenhuma conexão ativa para consulta:', consultationId)
    return
  }

  const message = `data: ${JSON.stringify(data)}\n\n`
  const encoder = new TextEncoder()
  const encoded = encoder.encode(message)

  // Enviar para todas as conexões ativas desta consulta
  console.log('📤 Enviando para', connections.size, 'conexões')
  connections.forEach((controller) => {
    try {
      controller.enqueue(encoded)
    } catch (error) {
      console.warn('⚠️ Erro ao enviar para conexão SSE:', error)
      // Remover conexão inválida
      connections.delete(controller)
    }
  })

  // Limpar set vazio
  if (connections.size === 0) {
    activeConnections.delete(consultationId)
  }
}

// Função para adicionar uma conexão
export function addConnection(consultationId: string, controller: ReadableStreamDefaultController) {
  if (!activeConnections.has(consultationId)) {
    activeConnections.set(consultationId, new Set())
  }
  activeConnections.get(consultationId)!.add(controller)
}

// Função para remover uma conexão
export function removeConnection(consultationId: string, controller: ReadableStreamDefaultController) {
  const connections = activeConnections.get(consultationId)
  if (connections) {
    connections.delete(controller)
    if (connections.size === 0) {
      activeConnections.delete(consultationId)
    }
  }
}

