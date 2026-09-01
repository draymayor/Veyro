import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export type TradeAssetType = 'gift_card' | 'crypto';

export interface TradeSubmittedProps {
  name: string;
  assetType: TradeAssetType;
  assetLabel: string;
  amount: string;
  rate: string;
  payout: string;
  tradeUrl: string;
}

export function TradeSubmitted({
  name,
  assetType,
  assetLabel,
  amount,
  rate,
  payout,
  tradeUrl,
}: TradeSubmittedProps) {
  const assetWord = assetType === 'gift_card' ? 'gift card' : 'crypto';

  return (
    <EmailLayout previewText="We've received your submission">
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
        We&apos;ve received your {assetWord} submission for {assetLabel},{' '}
        {amount}.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <Text
          style={{ margin: '0 0 8px', fontSize: 14, color: emailTheme.ink }}
        >
          Status: <strong>Under Review</strong>
        </Text>
        <Text
          style={{ margin: '0 0 8px', fontSize: 14, color: emailTheme.ink }}
        >
          Locked rate: {rate}
        </Text>
        <Text style={{ margin: 0, fontSize: 14, color: emailTheme.ink }}>
          Expected payout: {payout}
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
        We&apos;ll notify you as soon as it&apos;s verified.
      </Text>

      <EmailButton href={tradeUrl}>View Trade</EmailButton>
    </EmailLayout>
  );
}

export default TradeSubmitted;
