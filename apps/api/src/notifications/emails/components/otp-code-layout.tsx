import { Section, Text } from '@react-email/components';
import { EmailLayout } from './email-layout';
import { SecurityNote } from './security-note';
import { emailTheme } from './theme';

interface OtpCodeLayoutProps {
  previewText: string;
  heading: string;
  name?: string;
  intro: string;
  code: string;
  expiryMinutes: number;
  footnote?: string;
}

// Shared inner layout for the two OTP-code templates (verify email,
// password reset): near-identical structure, so this is the one place
// that renders the greeting, the code display, and the expiry line.
export function OtpCodeLayout({
  previewText,
  heading,
  name,
  intro,
  code,
  expiryMinutes,
  footnote,
}: OtpCodeLayoutProps) {
  const spacedCode = code.split('').join(' ');

  return (
    <EmailLayout previewText={previewText}>
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        {heading}
      </Text>
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name || 'there'},
        <br />
        {intro}
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '20px 0',
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: emailTheme.primary,
            fontFamily: 'monospace',
          }}
        >
          {spacedCode}
        </Text>
      </Section>

      <Text
        style={{
          margin: '16px 0 0',
          fontSize: 13,
          color: emailTheme.muted,
          textAlign: 'center',
        }}
      >
        This code expires in {expiryMinutes} minutes.
      </Text>

      {footnote && (
        <Text
          style={{
            margin: '20px 0 0',
            fontSize: 14,
            lineHeight: '22px',
            color: emailTheme.ink,
          }}
        >
          {footnote}
        </Text>
      )}

      <SecurityNote />
    </EmailLayout>
  );
}
