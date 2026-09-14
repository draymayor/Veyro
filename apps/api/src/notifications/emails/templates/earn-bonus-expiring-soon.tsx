import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface EarnBonusExpiringSoonProps {
  name: string;
  bonusAmount: string;
  requiredVolume: string;
  earnUrl: string;
}

// Sent by EarnExpiryWarningService's poller exactly once per claim, ~1 day
// before a still-'claimed' row's expires_at (claims run on a 3-day window,
// so this fires at the end of day 2). Never sent for a claim that's
// already 'unlocked'/'paid'/'expired' by the time the poller looks.
export function EarnBonusExpiringSoon({
  name,
  bonusAmount,
  requiredVolume,
  earnUrl,
}: EarnBonusExpiringSoonProps) {
  return (
    <EmailLayout previewText={`Your ${bonusAmount} bonus expires tomorrow`}>
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
        Your {bonusAmount} bonus expires tomorrow, sell {requiredVolume} or
        more in gift cards or crypto on Veyro to unlock it before it&apos;s
        gone.
      </Text>

      <Section style={{ textAlign: 'center', marginTop: 8 }}>
        <EmailButton href={earnUrl}>View Earn</EmailButton>
      </Section>
    </EmailLayout>
  );
}

export default EarnBonusExpiringSoon;
