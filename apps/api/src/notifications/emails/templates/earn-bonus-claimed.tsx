import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface EarnBonusClaimedProps {
  name: string;
  bonusAmount: string;
  requiredVolume: string;
  expiryDays: number;
  referralLink: string;
  referralBonusAmount: string;
  earnUrl: string;
}

// Sent the instant a user claims an Earn bonus option (EarnService.claim).
// Deliberately does not say the bonus is theirs yet - it only unlocks once
// they've generated real trade volume, docs/database-schema.md's whole
// reason this program exists in its current, non-exploitable form.
export function EarnBonusClaimed({
  name,
  bonusAmount,
  requiredVolume,
  expiryDays,
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
        You&apos;ve claimed {bonusAmount}!
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
          To unlock it
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: emailTheme.ink,
          }}
        >
          Sell gift cards or crypto worth {requiredVolume} or more on Veyro
        </Text>
        <Text
          style={{ margin: '8px 0 0', fontSize: 13, color: emailTheme.muted }}
        >
          within {expiryDays} days
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
