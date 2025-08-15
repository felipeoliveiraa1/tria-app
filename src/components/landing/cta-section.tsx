import { Button } from "@/components/ui/button"
import { Mic, Star, Clock, Shield } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="py-24 gradient-bg">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Comece a transformar suas consultas hoje mesmo
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/90">
            Junte-se aos +500 médicos que já aumentaram sua produtividade em 250% com o TRIA
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                Começar gratuitamente
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
              Agendar demonstração
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div className="text-sm text-white/90">Gravação automática</div>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-sm text-white/90">Economia de tempo</div>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="text-sm text-white/90">Alta precisão</div>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="text-sm text-white/90">100% seguro</div>
            </div>
          </div>
          
          <div className="mt-12 rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">
              Plano gratuito inclui:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white"></div>
                <span>10 consultas por mês</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white"></div>
                <span>Transcrição automática</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white"></div>
                <span>Relatórios básicos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
