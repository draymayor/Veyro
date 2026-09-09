import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The one Apply CTA on the Careers page, used in the hero and the final
 * CTA. applyHref is resolved server-side by page.tsx (createClient +
 * supabase.auth.getUser): already-logged-in users go straight to
 * /scout/apply, everyone else goes through /login?next=/scout/apply,
 * which carries the intended destination through the whole
 * login/signup/verify-email chain (see login/signup/verify-email page.tsx).
 */
export function CareersApplyButton({
  applyHref,
  size = "lg",
}: {
  applyHref: string;
  size?: "default" | "lg";
}) {
  return (
    <Button
      asChild
      size={size}
      className="h-12 rounded-full px-7 text-base"
    >
      <Link href={applyHref}>Apply to be a Scout</Link>
    </Button>
  );
}
