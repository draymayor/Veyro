import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { SecurityNote } from '../components/security-note';
import { emailTheme } from '../components/theme';

export interface WithdrawalFailedProps {
  name: string;
  amount: string;
  reason: string;
  contactSupportUrl: string;
}

// Sent when admin marks a withdrawal failed (admin-withdrawals.service.ts's
// markFailed), always alongside the compensating wallet credit-back that
// same call makes, never instead of it - the copy below states the funds
// were returned as fact, not a promise, since by the time this email sends
// the credit-back has already succeeded.
export function WithdrawalFailed({
  name,
  amount,
  reason,
  contactSupportUrl,
}: WithdrawalFailedProps) {
  return (
    <EmailLayout previewText="Your withdrawal couldn't be completed">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Your withdrawal couldn&apos;t be completed
      </Text>
      <Text
        style={{
          margin: '0 0 20px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name},
        <br />
        Your withdrawal of {amount} couldn&apos;t be completed.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <Text style={{ margin: 0, fontSize: 14, color: emailTheme.error }}>
          Reason: {reason}
        </Text>
      </Section>

      <Text
        style={{
          margin: '20px 0 24px',
          fontSize: 14,
          lineHeight: '22px',
          color: emailTheme.ink,
        }}
      >
        The funds have been returned to your wallet. Please check your details
        and try again, or contact Support if you need help.
      </Text>

      <EmailButton href={contactSupportUrl}>Contact Support</EmailButton>

      <SecurityNote />
    </EmailLayout>
  );
}

export default WithdrawalFailed;
