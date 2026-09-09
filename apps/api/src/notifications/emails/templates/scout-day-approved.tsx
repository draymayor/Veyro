import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface ScoutDayApprovedProps {
  name: string;
  amount: string;
  walletUrl: string;
}

// Sent the instant an admin approves a scout day
// (AdminScoutDaysService.approveDay), the same event that credits the
// wallet.
export function ScoutDayApproved({
  name,
  amount,
  walletUrl,
}: ScoutDayApprovedProps) {
  return (
    <EmailLayout previewText={`${amount} credited for your Scout day`}>
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name},
        <br />
        Your Scout day was approved. {amount} has been credited to your
        wallet as Scout Program income.
      </Text>

      <Section style={{ textAlign: 'center', marginTop: 8 }}>
        <EmailButton href={walletUrl}>View Wallet</EmailButton>
      </Section>
    </EmailLayout>
  );
}

export default ScoutDayApproved;
