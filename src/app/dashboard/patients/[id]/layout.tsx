export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'
import type { ReactNode } from 'react'

export default function PatientLayout({ children }: { children: ReactNode }) {
  try { noStore() } catch {}
  return children
}


