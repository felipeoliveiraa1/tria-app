import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { BenefitsSection } from "@/components/landing/benefits-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { FAQSection } from "@/components/landing/faq-section"
import { CTASection } from "@/components/landing/cta-section"

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <HeroSection />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="benefits">
          <BenefitsSection />
        </div>
        <div id="testimonials">
          <TestimonialsSection />
        </div>
        <FAQSection />
        <CTASection />
      </main>
      
      <Footer />
    </div>
  )
}
