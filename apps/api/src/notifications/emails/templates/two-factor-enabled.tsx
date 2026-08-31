import { Link, Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme, SUPPORT_EMAIL } from '../components/theme';

export interface TwoFactorEnabledProps {
  name: string;
}

// Sent the moment TOTP enrollment completes successfully (the opposite
// event from TwoFactorRecoveryUsed, which fires when 2FA gets turned back
// OFF via a backup code). Confirms the change landed and gives the user an
// immediate signal if they didn't make it themselves.
export function TwoFactorEnabled({ name }: TwoFactorEnabledProps) {
  return (
    <EmailLayout previewText="Two-factor authentication enabled on your account">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Two-factor authentication enabled
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
        Two-factor authentication was just turned on for your Veyro account.
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

export default TwoFactorEnabled;
