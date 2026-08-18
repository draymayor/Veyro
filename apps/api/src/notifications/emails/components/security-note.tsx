import { Link, Section, Text } from '@react-email/components';
import { emailTheme, SUPPORT_EMAIL } from './theme';

// Calm reassurance block for OTP, password reset, and trade
// approved/rejected emails: never asks for credentials, points to
// support if the email is unexpected.
export function SecurityNote() {
  return (
    <Section
      style={{
        backgroundColor: emailTheme.background,
        borderRadius: 12,
        padding: '16px 20px',
        marginTop: 24,
      }}
    >
      <Text
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: '20px',
          color: emailTheme.muted,
        }}
      >
        Veyro will never ask for your password or verification code. If you
        didn&apos;t request this, please contact{' '}
        <Link
          href={`mailto:${SUPPORT_EMAIL}`}
          style={{ color: emailTheme.primary }}
        >
          {SUPPORT_EMAIL}
        </Link>
        .
      </Text>
    </Section>
  );
}
