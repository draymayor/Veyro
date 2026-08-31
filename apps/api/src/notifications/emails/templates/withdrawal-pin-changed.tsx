import { Link, Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme, SUPPORT_EMAIL } from '../components/theme';

export interface WithdrawalPinChangedProps {
  name: string;
}

// Sent on both the initial PIN setup and any later change - one template,
// same copy either way, since "was just changed" reads naturally for a
// first-time set too and the security implication (something now differs
// from before) is the same in both cases.
export function WithdrawalPinChanged({ name }: WithdrawalPinChangedProps) {
  return (
    <EmailLayout previewText="Your withdrawal PIN was updated">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Your withdrawal PIN was updated
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
        Your withdrawal PIN was just changed.
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: '22px',
          color: emailTheme.muted,
        }}
      >
        Didn&apos;t do this? Contact{' '}
        <Link
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{ color: emailTheme.primary }}
        >
          {SUPPORT_EMAIL}
        </Link>{' '}
        immediately.
      </Text>
    </EmailLayout>
  );
}

export default WithdrawalPinChanged;
