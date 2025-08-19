"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

type Variant = "green" | "blue" | "red" | "cyan" | "orange"

const styles: Record<Variant, { accent: string; title: string; iconBg: string; icon: string }> = {
  green: { accent: "bg-emerald-500", title: "text-emerald-700 dark:text-emerald-400", iconBg: "bg-emerald-50 dark:bg-emerald-900/30", icon: "text-emerald-600 dark:text-emerald-400" },
  blue: { accent: "bg-blue-500", title: "text-blue-700 dark:text-blue-400", iconBg: "bg-blue-50 dark:bg-blue-900/30", icon: "text-blue-600 dark:text-blue-400" },
  red: { accent: "bg-red-500", title: "text-red-700 dark:text-red-400", iconBg: "bg-red-50 dark:bg-red-900/30", icon: "text-red-600 dark:text-red-400" },
  cyan: { accent: "bg-cyan-500", title: "text-cyan-700 dark:text-cyan-400", iconBg: "bg-cyan-50 dark:bg-cyan-900/30", icon: "text-cyan-600 dark:text-cyan-400" },
  orange: { accent: "bg-orange-500", title: "text-orange-700 dark:text-orange-400", iconBg: "bg-orange-50 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400" },
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  variant: Variant
  icon?: ReactNode
}

export function MetricCard({ title, value, subtitle = "para hoje", variant, icon }: MetricCardProps) {
  const s = styles[variant]
  return (
    <Card className="relative overflow-hidden border-border shadow-sm">
      <div className={`absolute left-0 top-0 h-full w-1 ${s.accent}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={`text-lg font-semibold ${s.title}`}>{title}</p>
            <div className="text-4xl font-bold leading-none">{value}</div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {icon && (
            <div className={`h-9 w-9 rounded-md grid place-items-center ${s.iconBg}`}>
              <div className={`${s.icon}`}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


