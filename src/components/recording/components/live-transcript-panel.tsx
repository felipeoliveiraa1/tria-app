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
    getTotalWords 
  } = useRecordingStore()
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastSegmentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para o final
  useEffect(() => {
    if (scrollAreaRef.current && (partialText || finalSegments.length > 0)) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [partialText, finalSegments])

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const copyAllText = async () => {
    const allText = finalSegments.map(s => s.text).join('\n\n')
    if (allText) {
      try {
        await navigator.clipboard.writeText(allText)
        console.log('Transcrição copiada para a área de transferência')
      } catch (error) {
        console.error('Erro ao copiar texto:', error)
      }
    }
  }

  const downloadTranscript = () => {
    const allText = finalSegments.map(s => s.text).join('\n\n')
    if (allText) {
      const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcricao-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllText}
                  className="h-8"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTranscript}
                  className="h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </>
            )}
            
            <Badge variant="outline" className="text-xs">
              {getTotalWords()} palavras
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-full p-0">
        <ScrollArea className="h-full px-6 pb-6" ref={scrollAreaRef}>
          {!hasContent ? (
            // Estado vazio
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-muted-foreground">
                  Nenhuma Transcrição Ainda
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Você deve ter pelo menos 1 minuto de gravação ou 5 segmentos para ver a transcrição aqui.
                </p>
              </div>
            </div>
          ) : (
            // Conteúdo da transcrição
            <div className="space-y-4">
              {/* Segmentos finais */}
              {finalSegments.map((segment, index) => (
                <div
                  key={segment.id}
                  ref={index === finalSegments.length - 1 ? lastSegmentRef : null}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Segmento {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(segment.startMs)}</span>
                      {segment.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {(segment.confidence * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-l-primary">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {segment.text}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Texto parcial (em tempo real) */}
              {partialText && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Falando agora...</span>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(elapsed)}</span>
                      <Badge variant="secondary" className="text-xs">
                        Em tempo real
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-primary/10 rounded-lg p-3 border-l-4 border-l-primary/50">
                    <p className="text-sm leading-relaxed text-primary/80 italic">
                      {partialText}
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
