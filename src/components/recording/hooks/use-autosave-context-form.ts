import { useEffect, useRef, useState } from 'react'
import { useRecordingSetupStore } from '../store/recording-setup-store'

export function useAutosaveContextForm() {
  const { context, setField } = useRecordingSetupStore()
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timer = useRef<NodeJS.Timeout | null>(null)

  const updateContext = (value: string) => {
    setField('context', value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLastSaved(new Date())
    }, 800)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { updateContext, lastSaved, value: context }
}
