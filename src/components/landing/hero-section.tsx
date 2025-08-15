import { Button } from "@/components/ui/button"
import { Mic, Play, Star } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary animate-fade-in">
            <Mic className="h-4 w-4" />
            <span>Assistente Virtual por IA</span>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl animate-slide-up">
            Transforme suas{" "}
            <span className="gradient-text">consultas médicas</span>{" "}
            com IA
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-muted-foreground animate-slide-up">
            Grave consultas presenciais e de telemedicina com transcrição automática 
            e relatórios estruturados. Aumente sua produtividade em 250%.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-slide-up">
            <Link href="/register">
              <Button size="lg" className="btn-primary">
                Comece grátis
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="btn-outline">
              <Play className="mr-2 h-4 w-4" />
              Ver demonstração
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2">4.9/5</span>
            </div>
            <span>•</span>
            <span>+500 médicos confiam no TRIA</span>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-primary-light opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
    </section>
  )
}
