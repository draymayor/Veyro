import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { SecurityNote } from '../components/security-note';
import { emailTheme } from '../components/theme';

export interface TwoFactorRecoveryUsedProps {
  name: string;
  settingsUrl: string;
}

// Sent the moment a backup code is redeemed (AuthService.recoverWithBackupCode)
// so the user finds out immediately if it wasn't them. Redeeming a backup
// code removes the account's TOTP factor entirely, so this doubles as a
// nudge to re-enroll a fresh authenticator.
export function TwoFactorRecoveryUsed({
  name,
  settingsUrl,
}: TwoFactorRecoveryUsedProps) {
  return (
    <EmailLayout previewText="A backup code was used on your Veyro account">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        A backup code was used on your account
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
        <br />A recovery backup code was just used to sign in to your Veyro
        account, and two-factor authentication has been turned off as a result.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <Text style={{ margin: 0, fontSize: 14, color: emailTheme.ink }}>
          If this was you, we recommend setting up two-factor authentication
          again with a new authenticator app.
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
        If you didn&apos;t do this, contact support immediately. Your account
        may be compromised.
      </Text>

      <EmailButton href={settingsUrl}>Re-enable Two-Factor Auth</EmailButton>

      <SecurityNote />
    </EmailLayout>
  );
}

export default TwoFactorRecoveryUsed;
