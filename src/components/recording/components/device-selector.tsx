import React from 'react'

interface DeviceSelectorProps {
  value?: string
  onValueChange: (deviceId: string, sampleRate: number) => void
  disabled?: boolean
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({ value, onValueChange, disabled }) => {
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([])
  const [selected, setSelected] = React.useState<string | undefined>(value)

  React.useEffect(() => {
    const load = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(t => t.stop())
        const list = await navigator.mediaDevices.enumerateDevices()
        setDevices(list.filter(d => d.kind === 'audioinput'))
      } catch (e) {
        console.warn('Erro ao listar dispositivos', e)
      }
    }
    load()
  }, [])

  const handleChange = (id: string) => {
    setSelected(id)
    onValueChange(id, 44100)
  }

  return (
    <select
      className="w-full border rounded p-2"
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Selecione um microfone</option>
      {devices.map(d => (
        <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
      ))}
    </select>
  )
}
