import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface ScoutApplicationApprovedProps {
  name: string;
  scoutUrl: string;
}

// Sent the instant an admin approves a Scout application
// (AdminScoutApplicationsService.approve).
export function ScoutApplicationApproved({
  name,
  scoutUrl,
}: ScoutApplicationApprovedProps) {
  return (
    <EmailLayout previewText="You're approved as a Veyro Scout">
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
        You&apos;re approved as a Veyro Scout. Start submitting links from
        your dashboard whenever you&apos;re ready.
      </Text>

      <Section style={{ textAlign: 'center', marginTop: 8 }}>
        <EmailButton href={scoutUrl}>Go to Scout Dashboard</EmailButton>
      </Section>
    </EmailLayout>
  );
}

export default ScoutApplicationApproved;
