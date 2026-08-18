"use client";

import { useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { Check, Loader2, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { value: "general", label: "General" },
  { value: "trade-issue", label: "Trade Issue" },
  { value: "account", label: "Account" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

interface FormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_VALUES: FormValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Tell us your name.";
  }

  if (!values.email.trim()) {
    errors.email = "We'll need an email to reply to.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "That email doesn't look quite right.";
  }

  if (!values.subject) {
    errors.subject = "Pick what this is about.";
  }

  if (!values.message.trim()) {
    errors.message = "Add a few details so we can help.";
  } else if (values.message.trim().length < 10) {
    errors.message = "A little more detail helps us respond faster.";
  }

  return errors;
}

const fieldClasses =
  "border-border bg-card text-ink placeholder:text-ink/35 focus-visible:border-primary/50 focus-visible:ring-primary/15 w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors outline-none focus-visible:ring-4 aria-invalid:border-destructive/50 aria-invalid:focus-visible:ring-destructive/15";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-destructive/90 animate-in fade-in mt-1.5 text-xs duration-200"
    >
      {message}
    </p>
  );
}

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormValues, boolean>>
  >({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const reducedMotion = usePrefersReducedMotion();
  const successRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) {
      setErrors(validate(next));
    }
  }

  function markTouched(key: keyof FormValues) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors(validate(values));
  }

  function animateSuccess() {
    if (reducedMotion) return;
    gsap.fromTo(
      successRef.current,
      { opacity: 0, y: 16, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
    );
    gsap.fromTo(
      checkRef.current,
      { scale: 0, rotate: -20, opacity: 0 },
      {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.55,
        delay: 0.15,
        ease: "back.out(2.2)",
      },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setTouched({ name: true, email: true, subject: true, message: true });

    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      requestAnimationFrame(animateSuccess);
    } catch {
      setStatus("error");
    }
  }

  function handleReset() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setTouched({});
    setStatus("idle");
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        className="border-border bg-card flex flex-col items-center rounded-2xl border px-8 py-16 text-center"
      >
        <span className="bg-success/15 flex size-14 items-center justify-center rounded-full">
          <Check
            ref={checkRef}
            className="text-success size-7"
            strokeWidth={2.5}
          />
        </span>
        <h3 className="font-heading text-ink mt-6 text-2xl font-semibold tracking-tight">
          Message sent
        </h3>
        <p className="text-ink/60 mt-2 max-w-sm text-sm text-pretty">
          We&apos;ll get back to you at {values.email || "your email"} within
          one business day.
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-8 rounded-full px-6"
          onClick={handleReset}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border-border bg-card rounded-2xl border p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-ink text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            onBlur={() => markTouched("name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={cn(fieldClasses, "mt-2")}
            placeholder="Your name"
          />
          <FieldError id="name-error" message={errors.name} />
        </div>

        <div>
          <label htmlFor="email" className="text-ink text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => markTouched("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={cn(fieldClasses, "mt-2")}
            placeholder="you@example.com"
          />
          <FieldError id="email-error" message={errors.email} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="subject" className="text-ink text-sm font-medium">
          What&apos;s this about?
        </label>
        <Select.Root
          value={values.subject}
          onValueChange={(v) => {
            setField("subject", v);
            markTouched("subject");
          }}
        >
          <Select.Trigger
            id="subject"
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "subject-error" : undefined}
            className={cn(
              fieldClasses,
              "data-[placeholder]:text-ink/35 mt-2 flex items-center justify-between gap-2",
            )}
          >
            <Select.Value placeholder="Choose a topic" />
            <Select.Icon>
              <ChevronDown className="text-ink/40 size-4" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={6}
              className="border-border bg-card z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border shadow-[0_10px_30px_rgba(28,27,41,0.12)]"
            >
              <Select.Viewport className="p-1">
                {SUBJECTS.map((subject) => (
                  <Select.Item
                    key={subject.value}
                    value={subject.value}
                    className="text-ink data-[highlighted]:bg-secondary data-[state=checked]:text-primary cursor-pointer rounded-md px-3 py-2 text-sm outline-none select-none"
                  >
                    <Select.ItemText>{subject.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <FieldError id="subject-error" message={errors.subject} />
      </div>

      <div className="mt-5">
        <label htmlFor="message" className="text-ink text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          onBlur={() => markTouched("message")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={cn(fieldClasses, "mt-2 resize-none")}
          placeholder="What's going on?"
        />
        <FieldError id="message-error" message={errors.message} />
      </div>

      {status === "error" && (
        <p className="text-destructive/90 mt-5 text-sm" role="alert">
          Something went wrong on our end. Please try again.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={status === "submitting"}
        className="mt-6 h-11 w-full rounded-full text-base sm:w-auto sm:px-8"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );
}
