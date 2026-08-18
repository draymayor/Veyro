import { Hr, Link, Section, Text } from '@react-email/components';
import { emailTheme, SUPPORT_EMAIL } from './theme';

// Divider + footer, shared by every template. Deliberately minimal: no
// app store badges, no social icons, nothing that doesn't exist yet.
export function EmailFooter() {
  const year = new Date().getFullYear();

  return (
    <>
      <Hr style={{ borderColor: emailTheme.border, margin: '24px 40px 0' }} />
      <Section style={{ padding: '20px 40px 32px', textAlign: 'center' }}>
        <Text
          style={{ margin: '0 0 4px', fontSize: 13, color: emailTheme.muted }}
        >
          Questions? Reach us at{' '}
          <Link
            href={`mailto:${SUPPORT_EMAIL}`}
            style={{ color: emailTheme.primary, textDecoration: 'none' }}
          >
            {SUPPORT_EMAIL}
          </Link>
        </Text>
        <Text
          style={{ margin: '0 0 4px', fontSize: 13, color: emailTheme.muted }}
        >
          This is an automated message, please do not reply.
        </Text>
        <Text style={{ margin: 0, fontSize: 12, color: emailTheme.muted }}>
          &copy; {year} Veyro. All rights reserved.
        </Text>
      </Section>
    </>
  );
}
