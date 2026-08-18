import { Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface WithdrawalRequestedProps {
  name: string;
  amount: string;
  method: string;
}

export function WithdrawalRequested({
  name,
  amount,
  method,
}: WithdrawalRequestedProps) {
  return (
    <EmailLayout previewText="Withdrawal request received">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Withdrawal request received
      </Text>
      <Text
        style={{
          margin: '0 0 8px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name},
        <br />
        We&apos;ve received your withdrawal request for {amount} via {method}.
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        We&apos;ll process this shortly and notify you once it&apos;s complete.
      </Text>
    </EmailLayout>
  );
}

export default WithdrawalRequested;
