import { Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface CryptoWithdrawalProcessingProps {
  name: string;
  amount: string;
  asset: string;
}

// Sent when a crypto withdrawal is created (withdrawals.service.ts's
// create): per product-rules.md rule 18b, crypto skips the 'requested'
// approval state and goes straight to 'processing' by default, so this
// email (not Withdrawal Requested) is the user's actual first notice, and
// it says "being processed" rather than "received" to match the real
// status.
export function CryptoWithdrawalProcessing({
  name,
  amount,
  asset,
}: CryptoWithdrawalProcessingProps) {
  return (
    <EmailLayout previewText="Your crypto withdrawal is on its way">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Your crypto withdrawal is on its way
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name},
        <br />
        Your withdrawal of {amount} {asset} is being processed to the address
        you provided. You&apos;ll be notified once it&apos;s complete.
      </Text>
    </EmailLayout>
  );
}

export default CryptoWithdrawalProcessing;
