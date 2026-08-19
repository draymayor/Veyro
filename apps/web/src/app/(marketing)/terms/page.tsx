// DRAFT: This page is placeholder legal copy written to accurately reflect
// Veyro's documented product and business rules (see docs/context.md and
// docs/product-rules.md), not generic gift-card-site boilerplate. It has
// NOT been reviewed by a lawyer. Veyro handles money transmission, gift
// card resale, and crypto payouts, all of which carry real regulatory
// exposure that varies by jurisdiction. This content must go through
// actual legal review before it is used as a binding agreement in
// production.

import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { LegalPageShell } from "@/components/legal/page-shell";
import { LegalSection } from "@/components/legal/section";
import type { TocItem } from "@/components/legal/toc";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const TOC_ITEMS: TocItem[] = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "description-of-service", label: "2. Description of Service" },
  { id: "eligibility", label: "3. Eligibility" },
  { id: "rates", label: "4. How Rates Work" },
  { id: "trade-submission", label: "5. Trade Submission & Verification" },
  { id: "wallet-and-payouts", label: "6. Wallet & Payouts" },
  { id: "rejected-trades", label: "7. Rejected Trades" },
  { id: "prohibited-use", label: "8. Prohibited Use" },
  {
    id: "account-restrictions",
    label: "9. Account Restrictions & Termination",
  },
  { id: "limitation-of-liability", label: "10. Limitation of Liability" },
  { id: "changes-to-terms", label: "11. Changes to These Terms" },
  { id: "contact", label: "12. Contact Information" },
];

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main>
        <LegalPageShell
          eyebrow="Legal"
          title="Terms of Service"
          intro="These Terms of Service govern your use of Veyro to sell gift cards and crypto for cash. Please read them carefully. By creating an account or using Veyro, you agree to be bound by these terms."
          tocItems={TOC_ITEMS}
        >
          <LegalSection id="acceptance" title="1. Acceptance of Terms">
            <p>
              These Terms of Service (&quot;Terms&quot;) form a binding
              agreement between you and Veyro (&quot;Veyro,&quot;
              &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your
              access to and use of the Veyro website, wallet, and related
              services (collectively, the &quot;Service&quot;).
            </p>
            <p>
              By creating a Veyro account, submitting a gift card or crypto
              trade, or otherwise using the Service, you confirm that you have
              read, understood, and agree to these Terms and to our Privacy
              Policy. If you do not agree, do not use the Service.
            </p>
          </LegalSection>

          <LegalSection
            id="description-of-service"
            title="2. Description of Service"
          >
            <p>
              Veyro is a platform where you sell gift cards and crypto directly
              to Veyro for cash. Veyro is the buyer and liquidator of the assets
              you submit, not an escrow service or a peer-to-peer marketplace
              connecting you with another seller or buyer.
            </p>
            <p>
              The core flow is: you select an asset, see a quoted rate, submit
              the asset for review, and, once approved, receive an automatic
              credit to your Veyro wallet. From your wallet, you can request a
              withdrawal to a supported payout method.
            </p>
            <p>
              Because Veyro is the counterparty to every trade, Veyro bears the
              liquidity and resale risk on assets it buys. This does not change
              your obligations under these Terms or the accuracy required of
              what you submit.
            </p>
          </LegalSection>

          <LegalSection id="eligibility" title="3. Eligibility">
            <p>To use Veyro, you must:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Be at least 18 years old, or the age of legal majority in your
                country of residence if that age is higher.
              </li>
              <li>
                Provide accurate, current information when creating your
                account, including selecting your country of residence.
              </li>
              <li>
                Maintain only one Veyro account per person. Duplicate accounts
                may be restricted or merged at Veyro&apos;s discretion.
              </li>
              <li>
                Have the legal right to sell any gift card or crypto asset you
                submit.
              </li>
            </ul>
            <p>
              The country you select at signup determines your wallet&apos;s
              primary currency. As of these Terms, Veyro supports one primary
              wallet currency per account, tied to that country selection; it is
              not changed after the fact except through account support.
            </p>
          </LegalSection>

          <LegalSection id="rates" title="4. How Rates Work">
            <p>
              Veyro shows you a computed rate before you submit anything. You
              will always see the estimated payout for your gift card or crypto
              before uploading a code, image, or deposit proof.
            </p>
            <p>
              Rates shown on Veyro are <strong>Platform Rates</strong>, meaning
              they are set and maintained by Veyro, not sourced from a live
              market data feed. Veyro does not represent Platform Rates as
              real-time market pricing. Rate structure is multi-dimensional: it
              depends on the specific brand or crypto asset, the country (for
              gift cards) or network (for crypto), the card type or network
              variant, and the denomination or amount range. There is no single
              flat rate per brand or asset.
            </p>
            <p>
              When you submit a trade, Veyro records and locks the rate that
              applied at that moment, along with the asset amount, quoted
              payout, currency, and timestamp. This snapshot is permanent: your
              trade is evaluated against the rate you submitted at, not against
              whatever the rate happens to be later, even if the rate changes
              before your trade finishes review.
            </p>
            <p>
              Veyro may add, edit, or deactivate rates at any time without prior
              notice and without deploying new software. Rate changes apply only
              to trades submitted after the change; they never retroactively
              alter a trade that has already been submitted.
            </p>
          </LegalSection>

          <LegalSection
            id="trade-submission"
            title="5. Trade Submission and Verification"
          >
            <p>
              <strong>Gift cards.</strong> To submit a gift card, you provide
              the brand, country, card type (physical or e-code), and
              denomination, plus either the card code and PIN (for e-codes) or
              clear photos of the physical card, and a receipt image where the
              brand requires one.
            </p>
            <p>
              <strong>Crypto.</strong> To submit crypto, you select the specific
              asset and network (for example, USDT on TRC20 versus USDT on ERC20
              are treated as distinct and are never assumed interchangeable),
              send the asset to the deposit address Veyro publishes for that
              asset and network, and submit your transaction hash together with
              a screenshot or other proof of deposit.
            </p>
            <p>
              Every trade moves through a defined lifecycle:{" "}
              <strong>Submitted</strong> to <strong>Under Review</strong> to{" "}
              <strong>Approved</strong> or <strong>Rejected</strong>, and
              finally <strong>Paid</strong> once your withdrawal is processed.
              Additional states such as Disputed or Cancelled may apply
              depending on the situation.
            </p>
            <p>
              In this version of Veyro, every submission is reviewed manually by
              our team before it is approved. We are not running fully automated
              verification yet. Your wallet is credited only when a trade
              reaches Approved status; there is no partial or conditional credit
              before verification completes, and once approved, the credit is
              applied automatically without a separate manual step.
            </p>
            <p>
              Veyro applies fraud and duplicate detection to both asset types,
              including checks for repeated or matching card codes and images,
              and duplicate or suspicious crypto deposit patterns. Flagged
              submissions are routed to manual review rather than automatically
              rejected or approved.
            </p>
          </LegalSection>

          <LegalSection id="wallet-and-payouts" title="6. Wallet and Payouts">
            <p>
              Your Veyro wallet balance is not a single editable number. Every
              credit and debit is recorded as its own ledger entry, and your
              displayed balance is derived from that ledger. Each user maintains
              one primary wallet currency, set at signup based on the country
              you selected.
            </p>
            <p>
              Once your wallet is credited, you may request a withdrawal.
              Supported payout methods are:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Bank Transfer.</strong> The fields required depend on
                your country and may include an account number, routing details,
                or an IBAN.
              </li>
              <li>
                <strong>PayPal.</strong> Paid out to the PayPal account you
                provide.
              </li>
              <li>
                <strong>Crypto.</strong> You must specify both the asset and the
                network you want to receive funds on; Veyro does not infer this
                for you.
              </li>
            </ul>
            <p>
              In this version of Veyro, withdrawals are not processed through an
              automated payment gateway. A member of our team manually sends
              each approved withdrawal (by bank transfer, PayPal, or crypto, as
              applicable) and marks it Paid with a reference note or transaction
              hash. Each withdrawal is its own ledger entry, separate from the
              trade that generated the underlying wallet credit.
            </p>
          </LegalSection>

          <LegalSection id="rejected-trades" title="7. Rejected Trades">
            <p>
              If a trade is rejected, you will see the reason directly on your
              submission, for example an incorrect code, a card that has already
              been redeemed, a balance that could not be verified with the
              issuer, or a crypto deposit that could not be confirmed on-chain.
            </p>
            <p>
              A rejected trade does not receive a wallet credit. Beyond
              reviewing the stated reason and contacting support if you believe
              the rejection was made in error, Veyro does not guarantee any
              automatic reversal, resubmission, or other recourse for a rejected
              trade.
            </p>
          </LegalSection>

          <LegalSection id="prohibited-use" title="8. Prohibited Use">
            <p>You may not use Veyro to submit or attempt to submit:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Fraudulent, stolen, or unlawfully obtained gift cards or crypto.
              </li>
              <li>
                Gift card codes, images, or crypto transaction hashes that
                duplicate a prior submission, whether by you or another account.
              </li>
              <li>
                Assets connected to money laundering, terrorist financing, or
                any other illegal activity.
              </li>
              <li>
                False account information, or an attempt to operate more than
                one account to evade limits or review.
              </li>
              <li>
                Any attempt to circumvent, manipulate, or interfere with
                Veyro&apos;s verification or fraud review process.
              </li>
            </ul>
            <p>
              Veyro treats these violations seriously. Accounts involved in
              prohibited use are subject to immediate restriction or
              termination, forfeiture of the trade in question, and reporting to
              law enforcement or regulators where Veyro is required or believes
              it appropriate to do so.
            </p>
          </LegalSection>

          <LegalSection
            id="account-restrictions"
            title="9. Account Restrictions and Termination"
          >
            <p>
              Veyro may restrict, suspend, or terminate your account or place a
              hold on your wallet balance where we identify suspicious activity
              or a violation of these Terms, including but not limited to
              duplicate or near-duplicate card images or codes, a crypto
              transaction hash submitted more than once, unusually rapid
              submission patterns, or proof of deposit that does not match the
              asset, network, or amount claimed.
            </p>
            <p>
              Where a hold or restriction is placed pending review, Veyro will
              work to resolve it promptly and will communicate the outcome to
              you. You may close your account at any time by contacting support;
              any verified, undisputed wallet balance will be made available for
              withdrawal subject to Veyro&apos;s standard payout process.
            </p>
          </LegalSection>

          <LegalSection
            id="limitation-of-liability"
            title="10. Limitation of Liability"
          >
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis. Veyro does not guarantee that the Service
              will be uninterrupted, error-free, or available at all times.
            </p>
            <p>
              Veyro is not responsible for losses caused by your own error,
              including but not limited to sending crypto on the wrong network
              or to an unsupported address, entering an incorrect gift card
              code, or submitting inaccurate deposit proof. Crypto sent on a
              network Veyro does not support for that asset may be permanently
              unrecoverable.
            </p>
            <p>
              Rates displayed before your trade is submitted are estimates and
              may change up until the moment you submit; once submitted, your
              rate is locked as described in Section 4. Veyro is not liable for
              differences between an earlier estimate and your locked rate, or
              for delays in manual review beyond our reasonable control.
            </p>
            <p>
              To the fullest extent permitted by law, Veyro is not liable for
              indirect, incidental, or consequential damages arising from your
              use of the Service, and Veyro&apos;s total liability for any claim
              will not exceed the amount of the trade or withdrawal giving rise
              to that claim.
            </p>
          </LegalSection>

          <LegalSection
            id="changes-to-terms"
            title="11. Changes to These Terms"
          >
            <p>
              Veyro may update these Terms from time to time to reflect changes
              to the Service, our business, or applicable law. When we make a
              material change, we will update this page and, where appropriate,
              notify you through the Service or by email.
            </p>
            <p>
              Continued use of Veyro after an update takes effect means you
              accept the revised Terms. We encourage you to review this page
              periodically.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="12. Contact Information">
            <p>
              If you have questions about these Terms, a specific trade, or your
              account, reach out through our{" "}
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
