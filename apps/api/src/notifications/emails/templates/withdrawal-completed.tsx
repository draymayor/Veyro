import { Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface WithdrawalCompletedProps {
  name: string;
  amount: string;
  method: string;
  transactionReference: string;
}

export function WithdrawalCompleted({
  name,
  amount,
  method,
  transactionReference,
}: WithdrawalCompletedProps) {
  return (
    <EmailLayout previewText="Your withdrawal is complete">
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
        {amount} has been sent via {method}.
        <br />
        Reference: {transactionReference}
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Thanks for using Veyro.
      </Text>
    </EmailLayout>
  );
}

export default WithdrawalCompleted;
