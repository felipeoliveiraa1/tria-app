"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"

interface GreetingCardProps {
  userName?: string | null
}

function computeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

export function GreetingCard({ userName }: GreetingCardProps) {
  // Evitar Date na renderização inicial (SSR) para não causar mismatch
  const [greeting, setGreeting] = useState<string>("Olá")
  useEffect(() => {
    setGreeting(computeGreeting())
  }, [])
  return (
    <Card className="border-border shadow-sm relative overflow-hidden h-full">
      <CardContent className="p-6 sm:p-7 h-full flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-3">
          <Logo />
          <span className="font-semibold tracking-wide">BETA</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold">
          {greeting}, <span className="text-primary">{userName || 'Doutor(a)'}</span>
        </h2>
        <p className="text-muted-foreground mt-3 text-lg">Você é o diferencial da sua clínica.</p>
      </CardContent>
    </Card>
  )
}


