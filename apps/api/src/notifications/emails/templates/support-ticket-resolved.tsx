import { Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface SupportTicketResolvedProps {
  name: string;
  category: string;
}

// Sent when admin marks a support_threads row resolved
// (admin-support.service.ts). The thread auto-reopens the instant the user
// replies (docs/database-schema.md's support_threads trigger), so this
// copy says exactly that rather than implying the conversation is closed
// for good.
export function SupportTicketResolved({
  name,
  category,
}: SupportTicketResolvedProps) {
  return (
    <EmailLayout previewText="Your support ticket has been resolved">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Your support ticket has been resolved
      </Text>
      <Text
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hi {name},
        <br />
        Your recent support conversation about {category} has been marked
        resolved. If you need anything else, just reply here and it&apos;ll
        reopen automatically.
      </Text>
    </EmailLayout>
  );
}

export default SupportTicketResolved;
