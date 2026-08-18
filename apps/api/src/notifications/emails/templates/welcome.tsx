import { Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface WelcomeProps {
  name: string;
  getStartedUrl: string;
}

export function Welcome({ name, getStartedUrl }: WelcomeProps) {
  return (
    <EmailLayout previewText="Welcome to Veyro">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Welcome to Veyro
      </Text>
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
        Your Veyro account is ready. You can now sell gift cards and crypto for
        instant wallet credit.
      </Text>

      <EmailButton href={getStartedUrl}>Get Started</EmailButton>

      <Text style={{ margin: '32px 0 0', fontSize: 14, color: emailTheme.ink }}>
        The Veyro Team
      </Text>
    </EmailLayout>
  );
}

export default Welcome;
