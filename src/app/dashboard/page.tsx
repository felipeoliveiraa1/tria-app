import { DashboardContent } from "@/components/dashboard/dashboard-content"
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { unstable_noStore as noStore } from 'next/cache'

export default function DashboardPage() {
  try { noStore() } catch {}
  return <DashboardContent />
}


