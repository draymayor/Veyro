import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { ContactHero } from "@/components/contact/hero";
import { ContactForm } from "@/components/contact/form";
import { ContactInfoPanel } from "@/components/contact/info-panel";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <ContactHero />

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
            <ScrollReveal direction="up" index={0}>
              <ContactForm />
            </ScrollReveal>
            <ScrollReveal direction="up" index={1}>
              <ContactInfoPanel />
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
