import { Mail, Clock } from "lucide-react";

const SOCIALS = [
  { label: "X", href: "https://x.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "TikTok", href: "https://tiktok.com" },
];

export function ContactInfoPanel() {
  return (
    <div className="border-border bg-card flex h-full flex-col justify-between rounded-2xl border p-6 sm:p-8">
      <div>
        <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
          Reach us directly
        </span>

        <div className="mt-6 flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <Mail className="size-4.5" />
          </span>
          <div>
            <p className="text-ink text-sm font-medium">Email</p>
            <a
              href="mailto:support@veyro.com"
              className="text-ink/60 hover:text-primary text-sm transition-colors"
            >
              support@veyro.com
            </a>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <Clock className="size-4.5" />
          </span>
          <div>
            <p className="text-ink text-sm font-medium">Response time</p>
            <p className="text-ink/60 text-sm">
              Most messages get a reply within one business day.
            </p>
          </div>
        </div>
      </div>

      <div className="border-border mt-8 border-t pt-6">
        <p className="text-ink/50 text-xs tracking-[0.15em] uppercase">
          Follow along
        </p>
        <div className="mt-3 flex items-center gap-4">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="text-ink/60 hover:text-primary text-sm font-medium transition-colors"
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
