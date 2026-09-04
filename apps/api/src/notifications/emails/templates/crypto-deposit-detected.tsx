import { Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface CryptoDepositDetectedProps {
  name: string;
  amount: string;
  asset: string;
}

// Sent the instant the Tatum webhook records a deposit (status
// 'pending_confirmation' on crypto_deposit_events) - before the
// confirmation-depth poller has actually credited anything. A distinct
// template from CryptoDepositCredited: this is "we've seen it, it's on
// its way," not "it's yours to spend now."
export function CryptoDepositDetected({
  name,
  amount,
  asset,
}: CryptoDepositDetectedProps) {
  return (
    <EmailLayout previewText={`We've spotted your incoming ${asset} deposit`}>
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
        We've spotted your incoming {asset} deposit on the network.
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
          Amount detected
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: emailTheme.ink,
          }}
        >
          {amount}
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
        It's waiting on the network's own confirmations before it's yours to
        spend - we'll email you again the moment it's fully credited. No
        action needed on your end.
      </Text>
    </EmailLayout>
  );
}

export default CryptoDepositDetected;
