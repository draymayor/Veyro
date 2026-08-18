import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <ScrollReveal direction="up" scale>
        <div className="bg-primary relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, rgba(250,247,242,0.25), transparent 45%), radial-gradient(circle at 85% 80%, rgba(28,27,41,0.2), transparent 45%)",
            }}
            aria-hidden="true"
          />
          <OrbitRings
            className="text-background pointer-events-none absolute top-1/2 left-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2"
            stroke="currentColor"
            dot="currentColor"
          />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-heading text-primary-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Ready to turn what you have into cash?
            </h2>
            <p className="text-primary-foreground/85 mt-4">
              Create your free Veyro account and see your rate before you submit
              anything.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-background text-ink hover:bg-background/90 h-12 rounded-full px-7 text-base"
              >
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
