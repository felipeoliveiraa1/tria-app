import { Mic, FileText, Brain } from "lucide-react"

const features = [
  {
    icon: Mic,
    title: "1. Grave a consulta",
    description: "Use seu microfone para gravar consultas presenciais ou de telemedicina. O sistema detecta automaticamente o melhor dispositivo de áudio."
  },
  {
    icon: Brain,
    title: "2. IA processa o áudio",
    description: "Nossa IA transcreve o áudio e analisa o conteúdo, identificando pontos-chave, diagnósticos e tratamentos mencionados."
  },
  {
    icon: FileText,
    title: "3. Relatório estruturado",
    description: "Receba relatórios completos e estruturados prontos para uso, incluindo resumo, pontos-chave e observações clínicas."
  }
]

export function FeaturesSection() {
  return (
    <section className="py-24 bg-muted">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Como funciona
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Em apenas 3 passos simples, transforme suas consultas em documentos estruturados
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <dt className="text-lg font-semibold leading-7 text-foreground">
                  {feature.title}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
