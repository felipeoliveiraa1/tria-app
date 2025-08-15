import React from 'react'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface TopActionsProps {
  onPrint?: () => void
  onShare?: () => void
  onImproveWithAI?: () => void
}

export const TopActions: React.FC<TopActionsProps> = ({ onPrint, onShare, onImproveWithAI }) => {
  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm" onClick={onPrint}><FileText className="h-4 w-4 mr-1"/> Imprimir</Button>
      <Button variant="outline" size="sm" onClick={onShare}>Compartilhar</Button>
      <Button variant="outline" size="sm" onClick={onImproveWithAI}>Melhorar com IA</Button>
    </div>
  )
}
