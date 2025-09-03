'use client';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

import DualMicLiveKitTranscriber from './DualMicLiveKitTranscriber';



type Props = {
  consultationId: string;
};

export default function TranscriberSelector({ consultationId }: Props) {

  return (
    <div className="space-y-6">
      {/* Sistema de Transcrição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Sistema de Transcrição Dual Mic</span>
          </CardTitle>
          <CardDescription>
            Captura simultânea de dois microfones com identificação automática de speaker
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sistema Dual Mic */}
      <DualMicLiveKitTranscriber consultationId={consultationId} />
    </div>
  );
}

