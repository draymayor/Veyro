import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { SecurityNote } from '../components/security-note';
import { emailTheme } from '../components/theme';
import type { TradeAssetType } from './trade-submitted';

export interface TradeRejectedProps {
  name: string;
  assetType: TradeAssetType;
  reason: string;
  contactSupportUrl: string;
}

export function TradeRejected({
  name,
  assetType,
  reason,
  contactSupportUrl,
}: TradeRejectedProps) {
  const assetWord = assetType === 'gift_card' ? 'gift card' : 'crypto';

  return (
    <EmailLayout previewText="Update on your submission">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Update on your submission
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
        Unfortunately, we couldn&apos;t approve your {assetWord} submission.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <Text style={{ margin: 0, fontSize: 14, color: emailTheme.error }}>
          Reason: {reason}
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
        If you believe this is a mistake, contact support.
      </Text>

      <EmailButton href={contactSupportUrl}>Contact Support</EmailButton>

      <SecurityNote />
    </EmailLayout>
  );
}

export default TradeRejected;
