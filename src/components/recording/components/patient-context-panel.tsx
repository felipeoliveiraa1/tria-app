import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, X, File, FileImage } from "lucide-react"
import { useAutosaveContext } from "../hooks/use-autosave-context"

interface PatientContextPanelProps {
  consultationId: string
  initialContext?: string
}

export function PatientContextPanel({ consultationId, initialContext = "" }: PatientContextPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { 
    context, 
    updateContext, 
    addAttachment, 
    removeAttachment, 
    lastSaved,
    isDirty
  } = useAutosaveContext(consultationId)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        addAttachment(file)
      })
    }
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />
    if (type === 'application/pdf') return <File className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Contexto da Consulta</span>
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Salvando...
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Adicione informações relevantes sobre o paciente e anexe documentos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contexto do paciente */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Contexto do Paciente</label>
          <Textarea
            placeholder="Descreva o contexto da consulta, sintomas, histórico médico, etc..."
            value={context.context}
            onChange={(e) => updateContext({ context: e.target.value })}
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            💡 Gere um documento mais rico em detalhes
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Adicionar Arquivos</span>
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Lista de anexos */}
        {context.attachments.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Anexos</label>
            <div className="space-y-2">
              {context.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {getFileIcon(attachment.type)}
                    <div className="text-sm">
                      <p className="font-medium">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)} • {attachment.uploadedAt.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status de salvamento */}
        {lastSaved && (
          <div className="text-xs text-muted-foreground">
            Último salvamento: {lastSaved.toLocaleTimeString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
