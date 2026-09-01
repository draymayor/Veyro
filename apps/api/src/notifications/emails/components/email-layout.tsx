import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';
import { emailTheme, LOGO_URL, SUPPORT_EMAIL } from './theme';
import { EmailFooter } from './email-footer';

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
}

// Shared shell every template wraps its content with: white header band
// (logo mark + terracotta wordmark), white content card, divider, footer.
// Nothing template-specific lives here, so a header/footer change only
// ever happens in one place.
export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: emailTheme.background,
          fontFamily: emailTheme.fontFamily,
          margin: 0,
          padding: '32px 16px',
        }}
      >
        <Container
          style={{
            maxWidth: 600,
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <Section
            style={{
              backgroundColor: '#FFFFFF',
              padding: '28px 0',
              textAlign: 'center',
              borderBottom: `1px solid ${emailTheme.border}`,
            }}
          >
            <Img
              src={LOGO_URL}
              alt="Veyro"
              width={28}
              height={28}
              style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                marginRight: 8,
              }}
            />
            <Text
              style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                margin: 0,
                color: emailTheme.primary,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              Veyro
            </Text>
          </Section>

          <Section style={{ padding: '40px 40px 8px' }}>{children}</Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export { emailTheme, SUPPORT_EMAIL };
