import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface BonusDepositReminderProps {
  name: string;
  bonusAmount: string;
  requiredDeposit: string;
  walletUrl: string;
}

// Sent by BonusReminderService's poller, at day 2 and again at day 4 for a
// still-locked Earn pool or welcome bonus. Shared copy across both
// programs and both reminder slots - after the second reminder, no more
// are ever sent (no expiry, the bonus just stays locked until deposited).
export function BonusDepositReminder({
  name,
  bonusAmount,
  requiredDeposit,
  walletUrl,
}: BonusDepositReminderProps) {
  return (
    <EmailLayout
      previewText={`Your ${bonusAmount} bonus is still waiting to be unlocked`}
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
        Your {bonusAmount} bonus is still sitting in your wallet, locked until
        you deposit crypto.
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

      <Section style={{ textAlign: 'center', marginTop: 24 }}>
        <EmailButton href={walletUrl}>View Wallet</EmailButton>
      </Section>
    </EmailLayout>
  );
}

export default BonusDepositReminder;
