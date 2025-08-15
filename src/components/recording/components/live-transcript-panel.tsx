import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRecordingStore } from "../store/recording-store"
import { FileText, Copy, Download, Clock, Mic } from "lucide-react"

interface LiveTranscriptPanelProps {
  className?: string
}

export function LiveTranscriptPanel({ className }: LiveTranscriptPanelProps) {
  const { 
    partialText, 
    finalSegments, 
    status, 
    elapsed,
    getTotalWords,
    realtimeConnected
  } = useRecordingStore()
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastSegmentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para o último segmento
  useEffect(() => {
    if (scrollAreaRef.current && lastSegmentRef.current) {
      lastSegmentRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [partialText, finalSegments])

  // Logs de debug para verificar estado
  useEffect(() => {
    console.log('📝 LiveTranscriptPanel - Estado atualizado:', {
      partialText,
      finalSegmentsCount: finalSegments.length,
      status,
      elapsed,
      realtimeConnected,
      totalWords: getTotalWords()
    })
  }, [partialText, finalSegments.length, status, elapsed, realtimeConnected, getTotalWords])

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const copyAllText = async () => {
    const allText = finalSegments.map(s => s.text).join(' ')
    try {
      await navigator.clipboard.writeText(allText)
      console.log('✅ Texto copiado para a área de transferência')
    } catch (error) {
      console.error('❌ Erro ao copiar texto:', error)
    }
  }

  const downloadTranscript = () => {
    const allText = finalSegments.map(s => s.text).join('\n')
    const blob = new Blob([allText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcricao-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasContent = finalSegments.length > 0 || partialText

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Transcrição em Tempo Real</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {hasContent && (
              <>
                <Button variant="outline" size="sm" onClick={copyAllText} className="h-8">
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTranscript} className="h-8">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </>
            )}
            
            <Badge variant="outline" className="text-xs">
              {getTotalWords()} palavras
            </Badge>
            
            {/* Indicador de status do STT mais visível */}
            <Badge 
              variant={realtimeConnected ? "default" : "secondary"} 
              className={`text-xs px-3 py-1 ${realtimeConnected ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
            >
              <Mic className="h-3 w-3 mr-1" />
              {realtimeConnected ? "STT ATIVO" : "STT INATIVO"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-full p-0">
        <ScrollArea className="h-full px-6 pb-6" ref={scrollAreaRef}>
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Mic className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {realtimeConnected ? 'Fale algo para começar a transcrição...' : 'STT não está conectado'}
              </p>
              <p className="text-sm">
                {realtimeConnected 
                  ? 'A transcrição em tempo real aparecerá aqui' 
                  : 'Clique em "Iniciar Gravação" para conectar o STT'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {finalSegments.map((segment, index) => (
                <div
                  key={segment.id}
                  ref={index === finalSegments.length - 1 ? lastSegmentRef : null}
                  className="flex items-start space-x-3"
                >
                  <Badge variant="outline" className="text-xs mt-1 flex-shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimestamp(segment.startMs)}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {segment.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {segment.timestamp.toLocaleTimeString()}
                      </span>
                      {segment.confidence && (
                        <span className="text-xs text-muted-foreground">
                          Confiança: {Math.round(segment.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {partialText && (
                <div className="flex items-start space-x-3">
                  <Badge variant="outline" className="text-xs mt-1 flex-shrink-0">
                    <Mic className="h-3 w-3 mr-1" />
                    Ao vivo
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm text-blue-600 font-medium">
                      {partialText}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Transcrição em tempo real...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
