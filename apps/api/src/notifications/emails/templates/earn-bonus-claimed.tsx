import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface EarnBonusClaimedProps {
  name: string;
  bonusAmount: string;
  requiredDeposit: string;
  referralLink: string;
  referralBonusAmount: string;
  earnUrl: string;
}

// Sent the instant a user claims an Earn bonus option (EarnService.claim).
// The bonus is already credited to the wallet at this point - it just
// isn't withdrawable yet, since it only unlocks once the user has
// deposited real crypto, docs/database-schema.md's whole reason this
// program exists in its current, non-exploitable form.
export function EarnBonusClaimed({
  name,
  bonusAmount,
  requiredDeposit,
  referralLink,
  referralBonusAmount,
  earnUrl,
}: EarnBonusClaimedProps) {
  return (
    <EmailLayout
      previewText={`You've claimed ${bonusAmount} - here's how to unlock it`}
    >
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name},
        <br />
        You&apos;ve claimed {bonusAmount}! It's already in your wallet.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <Text
          style={{ margin: '0 0 4px', fontSize: 13, color: emailTheme.muted }}
        >
          To make it withdrawable
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: emailTheme.ink,
          }}
        >
          Deposit crypto worth {requiredDeposit} or more
        </Text>
      </Section>

      <Text
        style={{
          margin: '20px 0 0',
          fontSize: 14,
          lineHeight: '22px',
          color: emailTheme.ink,
        }}
      >
        Want a head start? Share your referral link and earn{' '}
        {referralBonusAmount} per referral:
        <br />
        <span style={{ color: emailTheme.primary, wordBreak: 'break-all' }}>
          {referralLink}
        </span>
      </Text>

      <Section style={{ textAlign: 'center', marginTop: 24 }}>
        <EmailButton href={earnUrl}>View Earn</EmailButton>
      </Section>
    </EmailLayout>
  );
}

export default EarnBonusClaimed;
