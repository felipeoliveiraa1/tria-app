import React from 'react'

interface DebugOverlayProps {
  doctorActive: boolean
  patientActive: boolean
  doctorRms: number
  patientRms: number
  doctorFloorHold: number
  patientFloorHold: number
  currentSpeaker?: 'doctor' | 'patient'
}

export function DebugOverlay({
  doctorActive,
  patientActive,
  doctorRms,
  patientRms,
  doctorFloorHold,
  patientFloorHold,
  currentSpeaker
}: DebugOverlayProps) {
  if (process.env.NEXT_PUBLIC_DEBUG_VAD !== '1') {
    return null
  }

  const now = Date.now()
  const doctorHoldRemaining = Math.max(0, doctorFloorHold - now)
  const patientHoldRemaining = Math.max(0, patientFloorHold - now)

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-xs z-50">
      <div className="mb-2 font-bold">VAD Debug</div>
      
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${doctorActive ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span>Doctor:</span>
          <span className={doctorActive ? 'text-green-400' : 'text-gray-400'}>
            {doctorActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <span>RMS: {doctorRms.toFixed(4)}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${patientActive ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span>Patient:</span>
          <span className={patientActive ? 'text-green-400' : 'text-gray-400'}>
            {patientActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <span>RMS: {patientRms.toFixed(4)}</span>
        </div>
        
        <div className="pt-2 border-t border-gray-600">
          <div>Current Speaker: {currentSpeaker || 'NONE'}</div>
          <div>Doctor Hold: {doctorHoldRemaining}ms</div>
          <div>Patient Hold: {patientHoldRemaining}ms</div>
        </div>
      </div>
    </div>
  )
}