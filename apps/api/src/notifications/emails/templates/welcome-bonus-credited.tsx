import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface WelcomeBonusCreditedProps {
  name: string;
  bonusAmount: string;
  requiredDeposit: string;
  walletUrl: string;
}

// Sent the instant signup completes (WelcomeBonusService.grantOnSignupComplete,
// called from AuthService.verifyOtp / bootstrapOAuth). Already credited to
// the wallet - this just explains the deposit requirement to make it
// withdrawable, same shape as EarnBonusClaimed.
export function WelcomeBonusCredited({
  name,
  bonusAmount,
  requiredDeposit,
  walletUrl,
}: WelcomeBonusCreditedProps) {
  return (
    <EmailLayout
      previewText={`Your ${bonusAmount} welcome bonus is in your wallet`}
    >
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Welcome to Veyro, {name}!
        <br />
        Your {bonusAmount} welcome bonus has been credited to your wallet.
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

export default WelcomeBonusCredited;
