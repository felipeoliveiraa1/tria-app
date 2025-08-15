"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const faqs = [
  {
    question: "Como funciona a transcrição automática?",
    answer: "Nossa IA utiliza tecnologia avançada de reconhecimento de voz para transcrever suas consultas com 99.5% de precisão. O sistema processa o áudio em tempo real e gera transcrições completas."
  },
  {
    question: "Meus dados estão seguros?",
    answer: "Sim! Todos os dados são criptografados e armazenados em servidores seguros no Brasil, em conformidade com a LGPD. Você mantém total controle sobre suas informações."
  },
  {
    question: "Posso usar em consultas presenciais e telemedicina?",
    answer: "Perfeitamente! O TRIA funciona tanto para consultas presenciais quanto para telemedicina. Basta usar seu microfone ou o microfone do computador."
  },
  {
    question: "Quanto tempo leva para processar uma consulta?",
    answer: "O processamento é feito em tempo real. A transcrição fica pronta em poucos segundos após o fim da gravação, e o relatório estruturado em menos de 1 minuto."
  },
  {
    question: "Posso personalizar os relatórios?",
    answer: "Sim! Você pode criar templates personalizados para diferentes tipos de consulta e especialidades médicas. O sistema aprende com seu uso e se adapta ao seu estilo."
  },
  {
    question: "Há limite de gravações no plano gratuito?",
    answer: "O plano gratuito inclui 10 consultas por mês. Para uso ilimitado, você pode fazer upgrade para o plano Pro ou Enterprise."
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Tire suas dúvidas sobre o TRIA
          </p>
        </div>
        
        <div className="mt-16">
          <dl className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-lg border border-border">
                <button
                  className="flex w-full items-start justify-between p-6 text-left"
                  onClick={() => toggleFAQ(index)}
                >
                  <dt className="text-lg font-semibold leading-7 text-foreground">
                    {faq.question}
                  </dt>
                  <div className="ml-6 flex h-7 items-center">
                    {openIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>
                
                {openIndex === index && (
                  <dd className="px-6 pb-6">
                    <p className="text-base leading-7 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-lg text-muted-foreground mb-6">
            Ainda tem dúvidas? Nossa equipe está aqui para ajudar!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-dark">
              Falar com especialista
            </button>
            <button className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-muted">
              Ver documentação
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
