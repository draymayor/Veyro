import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface EarnBonusUnlockedProps {
  name: string;
  bonusAmount: string;
  walletUrl: string;
}

// Sent from EarnService.payOutUnlockedBonus, the instant a claimed Earn
// bonus's required trade volume is met and the wallet credit lands - the
// only email for this program that means real money has actually moved.
export function EarnBonusUnlocked({
  name,
  bonusAmount,
  walletUrl,
}: EarnBonusUnlockedProps) {
  return (
    <EmailLayout previewText="Your Earn bonus has been credited">
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hey {name},
        <br />
        You hit your trade volume goal, your Earn bonus is unlocked and
        credited.
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
          Amount credited
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: emailTheme.success,
          }}
        >
          {bonusAmount}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', marginTop: 24 }}>
        <EmailButton href={walletUrl}>View Wallet</EmailButton>
      </Section>
    </EmailLayout>
  );
}

export default EarnBonusUnlocked;
