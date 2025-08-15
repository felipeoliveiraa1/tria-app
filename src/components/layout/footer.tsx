import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Logo />
            <p className="text-sm leading-6 text-muted-foreground">
              Transforme suas consultas médicas com IA. Grave consultas presenciais e de telemedicina 
              com transcrição automática e relatórios estruturados.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Produto</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Como funciona
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Recursos
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Preços
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">Suporte</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Central de ajuda
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Contato
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Status
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Empresa</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Sobre nós
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Carreiras
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Privacidade
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      Termos
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                      LGPD
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-border pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-muted-foreground">
            &copy; 2024 TRIA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
