import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Dr. Carlos Silva",
    specialty: "Cardiologista",
    rating: 5,
    text: "O TRIA revolucionou minha prática. Agora consigo focar 100% no paciente enquanto a IA cuida da documentação. Economizo mais de 2 horas por dia!"
  },
  {
    name: "Dra. Ana Costa",
    specialty: "Pediatra",
    rating: 5,
    text: "Excelente ferramenta! A transcrição é precisa e os relatórios são muito bem estruturados. Meus pacientes adoram que eu não fico mais digitando durante a consulta."
  },
  {
    name: "Dr. Roberto Santos",
    specialty: "Ortopedista",
    rating: 5,
    text: "Implementei o TRIA há 3 meses e minha produtividade aumentou significativamente. Consigo atender mais pacientes sem comprometer a qualidade."
  }
]

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-muted">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            O que nossos médicos dizem
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Médicos de todo o Brasil já transformaram suas práticas com o TRIA
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="flex flex-col justify-between rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border">
              <div className="flex items-center gap-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <blockquote className="text-lg leading-8 text-foreground mb-6">
                &ldquo;{testimonial.text}&rdquo;
              </blockquote>
              
              <div>
                <div className="font-semibold text-foreground">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground">{testimonial.specialty}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <div className="rounded-2xl bg-primary/5 p-8">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Junte-se aos +500 médicos que já confiam no TRIA
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Comece gratuitamente hoje mesmo e veja a diferença na sua prática
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2">4.9/5</span>
              </div>
              <span>•</span>
              <span>Baseado em +2.000 avaliações</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
