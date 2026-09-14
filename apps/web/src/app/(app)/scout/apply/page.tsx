import { redirect } from "next/navigation";

// /scout now merges the explainer/apply-form and the approved dashboard
// into one route (ScoutExplainer inline on /scout for a non-scout), so this
// route is kept only as a redirect for any old bookmarks/links.
export default function ScoutApplyRedirectPage() {
  redirect("/scout");
}
