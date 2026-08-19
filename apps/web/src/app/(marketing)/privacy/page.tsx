// DRAFT: This page is placeholder privacy copy written to accurately
// reflect Veyro's actual data model (see docs/database-schema.md and
// docs/supabase-setup.md) and business rules (docs/product-rules.md,
// docs/admin-guide.md), not generic privacy-policy boilerplate. It has
// NOT been reviewed by a lawyer. Veyro is global (docs/context.md), so
// users sign up from many jurisdictions with real data protection
// requirements (GDPR in the EU, NDPR in Nigeria, and others depending on
// where a user is based). A generated draft cannot safely satisfy those
// requirements on its own. This content must go through actual legal
// review, including a jurisdiction-by-jurisdiction assessment, before it
// is used as a binding policy in production.

import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { LegalPageShell } from "@/components/legal/page-shell";
import { LegalSection } from "@/components/legal/section";
import type { TocItem } from "@/components/legal/toc";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const TOC_ITEMS: TocItem[] = [
  { id: "introduction", label: "1. Introduction and Scope" },
  { id: "what-we-collect", label: "2. What We Collect" },
  { id: "how-we-use-data", label: "3. How We Use This Data" },
  { id: "manual-review", label: "4. Manual Review Disclosure" },
  { id: "data-storage-and-security", label: "5. Data Storage & Security" },
  { id: "data-sharing", label: "6. Data Sharing" },
  { id: "data-retention", label: "7. Data Retention" },
  { id: "user-rights", label: "8. Your Rights" },
  { id: "cookies-and-tracking", label: "9. Cookies & Tracking" },
  { id: "childrens-privacy", label: "10. Children's Privacy" },
  { id: "changes-to-policy", label: "11. Changes to This Policy" },
  { id: "contact", label: "12. Contact Information" },
];

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main>
        <LegalPageShell
          eyebrow="Legal"
          title="Privacy Policy"
          intro="This Privacy Policy explains what personal data Veyro collects when you sell gift cards or crypto through the platform, how we use it, and the choices you have. It should be read alongside our Terms of Service."
          tocItems={TOC_ITEMS}
        >
          <LegalSection id="introduction" title="1. Introduction and Scope">
            <p>
              This policy applies to personal data Veyro collects through the
              Veyro website, wallet, and related services (the
              &quot;Service&quot;). It covers what we collect, why we collect
              it, how it is stored, and the rights available to you.
            </p>
            <p>
              Veyro is a global platform: users sign up from many countries, and
              your country of residence determines your wallet&apos;s primary
              currency. Where a specific data protection law applies to you (for
              example GDPR if you are in the EU, or NDPR if you are in Nigeria),
              that law may give you additional or different rights than
              described here; those jurisdiction-specific details are still
              being finalized with legal counsel.
            </p>
          </LegalSection>

          <LegalSection id="what-we-collect" title="2. What We Collect">
            <p>We collect the following categories of personal data:</p>
            <p>
              <strong>Account and profile information.</strong> Your email
              address and password, handled through our authentication provider.
              The country you select at signup, which determines your
              wallet&apos;s primary currency. Internal account status (active,
              restricted, or banned) and KYC status, which in this version of
              Veyro is a manual judgment call by our team rather than an
              automated check. If you were referred by another user, we record
              that relationship and your own referral code.
            </p>
            <p>
              <strong>Trade data.</strong> For gift card trades: the brand,
              country, card type, and denomination you select, the card code and
              PIN you submit, and any card or receipt images you upload. For
              crypto trades: the asset and network you select, the deposit
              transaction hash you submit, and your proof-of-deposit screenshot.
              In both cases, we also keep the trade&apos;s status history and
              timestamps.
            </p>
            <p>
              <strong>Financial and payout data.</strong> When you request a
              withdrawal, we collect the details needed for that payout method:
              bank account details for bank transfer (the exact fields vary by
              country), your PayPal email address, or a crypto payout address
              together with the asset and network you specify. Once a payout is
              completed, we record a transaction reference.
            </p>
            <p>
              <strong>Wallet ledger data.</strong> Every credit to your wallet
              from an approved trade and every debit from a withdrawal is
              recorded as its own permanent entry, along with your running
              balance at that point.
            </p>
            <p>
              <strong>Usage and device data.</strong> Standard technical data
              such as your IP address, device type, and browser information,
              collected for account security and fraud prevention.
            </p>
          </LegalSection>

          <LegalSection id="how-we-use-data" title="3. How We Use This Data">
            <p>We use the data described above to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Verify and process the gift card or crypto trades you submit,
                including reviewing submitted codes, PINs, images, and deposit
                proof.
              </li>
              <li>
                Credit your wallet once a trade is approved, and maintain the
                ledger that backs your wallet balance.
              </li>
              <li>Process withdrawals through your selected payout method.</li>
              <li>
                Detect and prevent fraud, including duplicate or near-duplicate
                card codes and images, reused crypto transaction hashes,
                unusually rapid submission patterns, and deposit proof that does
                not match what was claimed.
              </li>
              <li>Assess and maintain your account and KYC status.</li>
              <li>
                Communicate with you about trade status, account activity, and
                support requests, primarily by email.
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="manual-review" title="4. Manual Review Disclosure">
            <p>
              We want to state this plainly rather than leave it implied. In
              this version of Veyro, every trade is reviewed manually by a
              member of our team before it is approved. There is no fully
              automated verification yet.
            </p>
            <p>
              This means that when you submit a gift card, the code and PIN you
              enter, along with any card or receipt images you upload, are
              directly viewed by an authorized reviewer as part of approving
              your trade. When you submit a crypto trade, your transaction hash
              and proof-of-deposit screenshot are viewed the same way, alongside
              a manual check against the relevant block explorer.
            </p>
            <p>
              Access to this data is limited to personnel who perform trade
              review, and sensitive fields such as the card code and PIN are
              access-restricted at the database level. But we are not going to
              describe this review step as invisible or fully automated when it
              is not: a person on our team sees this information as part of
              verifying your trade. If and when Veyro introduces automated
              verification, this section will be updated to reflect that.
            </p>
          </LegalSection>

          <LegalSection
            id="data-storage-and-security"
            title="5. Data Storage and Security"
          >
            <p>
              Veyro&apos;s data is stored on Supabase, using Postgres for
              database records, Supabase Auth for account authentication, and
              Supabase Storage for uploaded files. Veyro uses its own dedicated
              Supabase project, separate from any other product we operate, with
              no shared data or authentication between them.
            </p>
            <p>
              Sensitive trade fields, including gift card codes and PINs, are
              access-restricted within our database. Uploaded card images,
              receipts, and crypto deposit-proof screenshots are kept in private
              storage buckets; they are never exposed through a public URL.
              Access to these files is granted only through short-lived signed
              URLs generated by our backend for an authorized viewer, whether
              that is you viewing your own submission or an admin performing
              review.
            </p>
            <p>
              We apply row-level security so that, at the database level, you
              can only read your own trades, wallet, wallet ledger entries, and
              withdrawals. Your wallet and its ledger have no direct write
              access from the client at all; those entries are created only by
              our backend, under the rules described in this policy and our
              Terms of Service. Administrative actions, such as approving a
              trade or processing a withdrawal, are performed through backend
              endpoints that verify admin permission server-side, not through
              open client access.
            </p>
          </LegalSection>

          <LegalSection id="data-sharing" title="6. Data Sharing">
            <p>
              We do not sell your personal data. We do not share your gift card
              codes, PINs, crypto deposit details, or other trade data with
              third parties beyond what is operationally necessary to run the
              Service, and beyond what is described below.
            </p>
            <p>
              As of this policy, Veyro does not have a live market-rate data
              provider connected; rates are set manually by our team. If we
              connect a live rate provider in the future, only the data
              necessary to source a rate (not your submitted card codes or
              crypto transaction details) would be involved, and this policy
              will be updated accordingly.
            </p>
            <p>
              As of this policy, Veyro does not have an automated KYC provider
              connected; KYC status is a manual judgment call by our team. If an
              automated KYC provider is introduced in a later phase, we would
              share only the identity-verification data necessary with that
              provider, under its own privacy and security terms, and this
              policy will be updated first.
            </p>
            <p>
              As of this policy, Veyro does not integrate with a payment
              gateway; withdrawals are processed manually by our team. No payout
              data is currently shared with a payment processor such as Paystack
              or Flutterwave, because no such integration exists yet.
            </p>
            <p>
              We may disclose data where required by law, to respond to a valid
              legal request, to investigate suspected fraud or violations of our
              Terms of Service, or to protect the rights, property, or safety of
              Veyro or our users.
            </p>
          </LegalSection>

          <LegalSection id="data-retention" title="7. Data Retention">
            <p>
              We retain trade records, card images, and crypto deposit-proof
              screenshots for as long as needed to complete and, if applicable,
              dispute a trade, and afterward for as long as needed to meet our
              accounting, fraud-prevention, and recordkeeping obligations. A
              specific retention schedule is still being finalized with legal
              counsel.
            </p>
            <p>
              Wallet ledger entries and withdrawal records are treated as
              permanent financial records. Ledger entries are append-only: once
              written, an entry is never edited or deleted, and any correction
              is made through a new offsetting entry. Because this ledger is the
              source of truth for your wallet balance and for our accounting, we
              retain it for longer than most other data, generally for as long
              as required by applicable financial recordkeeping obligations.
            </p>
          </LegalSection>

          <LegalSection id="user-rights" title="8. Your Rights">
            <p>Depending on where you live, you may have the right to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Request access to the personal data we hold about you.</li>
              <li>
                Request correction of inaccurate account information, such as
                your email address or country.
              </li>
              <li>
                Request deletion of your account and associated personal data.
              </li>
            </ul>
            <p>
              We want to be honest about a limit here: even if you request
              deletion, we may retain certain records despite that request,
              specifically completed trade records and wallet ledger entries,
              where retention is required for legal, accounting, or
              fraud-prevention reasons described in Section 7. We do not offer
              unconditional deletion of your entire history for this reason.
            </p>
            <p>
              To exercise any of these rights, contact us using the details in
              Section 12. The specific rights available to you, and how we
              respond to a request, may depend on the data protection law that
              applies in your country; that detail is still being finalized with
              legal counsel.
            </p>
          </LegalSection>

          <LegalSection
            id="cookies-and-tracking"
            title="9. Cookies and Tracking"
          >
            <p>
              We keep this section short because we would rather accurately
              describe what we do than list things we don&apos;t do. Veyro uses
              the session and authentication cookies set by our authentication
              provider to keep you signed in and to verify that requests to our
              backend come from your authenticated session.
            </p>
            <p>
              As of this policy, Veyro does not use third-party analytics or
              advertising tracking cookies. If that changes, we will update this
              section to describe what was added and why, rather than leaving it
              as a general statement that no longer matches reality.
            </p>
          </LegalSection>

          <LegalSection id="childrens-privacy" title="10. Children's Privacy">
            <p>
              Veyro is not intended for use by anyone under 18 years old, or
              under the age of legal majority in their country of residence if
              that age is higher. We do not knowingly collect personal data from
              minors.
            </p>
            <p>
              If we learn that an account belongs to someone under the
              applicable age, we will take steps to close the account and delete
              the associated personal data, subject to the same retention limits
              described in Section 7.
            </p>
          </LegalSection>

          <LegalSection
            id="changes-to-policy"
            title="11. Changes to This Policy"
          >
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes to the Service, our data practices, or applicable law.
              When we make a material change, we will update this page and,
              where appropriate, notify you through the Service or by email.
            </p>
            <p>
              Continued use of Veyro after an update takes effect means you
              accept the revised policy. We encourage you to review this page
              periodically.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="12. Contact Information">
            <p>
              If you have questions about this Privacy Policy or want to
              exercise any of the rights described in Section 8, reach out
              through our{" "}
              <Link
                href="/contact"
                className="text-primary underline underline-offset-4"
              >
                Contact Us
              </Link>{" "}
              page or email{" "}
              <a
                href="mailto:support@veyro.com"
                className="text-primary underline underline-offset-4"
              >
                support@veyro.com
              </a>
              . We usually reply within one business day.
            </p>
          </LegalSection>
        </LegalPageShell>
      </main>
      <Footer />
    </>
  );
}
