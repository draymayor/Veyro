import { Link, Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme, SUPPORT_EMAIL } from '../components/theme';

export type SecurityResetType = 'two_factor' | 'withdrawal_pin';

export interface SecurityResetByAdminProps {
  name: string;
  resetType: SecurityResetType;
  date: string;
}

function resetTypeLabel(resetType: SecurityResetType): string {
  return resetType === 'two_factor' ? '2FA' : 'withdrawal PIN';
}

// Sent from the User Management security-override actions
// (admin-users.service.ts's resetTotp / resetWithdrawalPin), the
// account-recovery path for a user who's fully locked out. This is the
// user's only notice that Support touched their security settings, so it
// fires from the admin action itself, not from the user's next login.
export function SecurityResetByAdmin({
  name,
  resetType,
  date,
}: SecurityResetByAdminProps) {
  const label = resetTypeLabel(resetType);

  return (
    <EmailLayout previewText="A security setting on your account was reset">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        A security setting was reset
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
        At your request (or as part of an account recovery), Veyro Support reset
        your {label} on {date}. Please set it up again the next time you log in.
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: '22px',
          color: emailTheme.muted,
        }}
      >
        Didn&apos;t request this? Contact{' '}
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

export default SecurityResetByAdmin;
