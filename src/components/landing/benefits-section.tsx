import { Clock, Users, TrendingUp, Shield } from "lucide-react"

const benefits = [
  {
    icon: Clock,
    title: "250% mais produtividade",
    description: "Reduza o tempo de documentação de 30 para 8 minutos por consulta"
  },
  {
    icon: Users,
    title: "Atendimento humanizado",
    description: "Foque no paciente enquanto a IA cuida da documentação"
  },
  {
    icon: TrendingUp,
    title: "Crescimento do faturamento",
    description: "Aumente sua capacidade de atendimento sem comprometer a qualidade"
  },
  {
    icon: Shield,
    title: "Segurança e conformidade",
    description: "Dados criptografados e em conformidade com a LGPD"
  }
]

export function BenefitsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Por que escolher o TRIA?
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Transforme sua prática médica com tecnologia de ponta
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex gap-x-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <dt className="text-lg font-semibold leading-7 text-foreground">
                    {benefit.title}
                  </dt>
                  <dd className="mt-4 text-base leading-7 text-muted-foreground">
                    {benefit.description}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        
        <div className="mt-16 text-center">
          <div className="rounded-2xl bg-primary/5 p-8">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Estatísticas impressionantes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary">250%</div>
                <div className="text-sm text-muted-foreground">Aumento na produtividade</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">8 min</div>
                <div className="text-sm text-muted-foreground">Tempo médio de documentação</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">99.5%</div>
                <div className="text-sm text-muted-foreground">Precisão na transcrição</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
