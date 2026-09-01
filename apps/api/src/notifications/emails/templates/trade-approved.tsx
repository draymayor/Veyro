import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { SecurityNote } from '../components/security-note';
import { emailTheme } from '../components/theme';
import type { TradeAssetType } from './trade-submitted';

export interface TradeApprovedProps {
  name: string;
  assetType: TradeAssetType;
  payoutAmount: string;
  balance: string;
  withdrawUrl: string;
}

export function TradeApproved({
  name,
  assetType,
  payoutAmount,
  balance,
  withdrawUrl,
}: TradeApprovedProps) {
  const assetWord = assetType === 'gift_card' ? 'gift card' : 'crypto';

  return (
    <EmailLayout
      previewText={`You've been paid: ${payoutAmount} added to your wallet`}
    >
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
        Your {assetWord} submission has been verified.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <Text
          style={{ margin: '0 0 4px', fontSize: 13, color: emailTheme.muted }}
        >
          Added to your wallet
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: emailTheme.success,
          }}
        >
          {payoutAmount}
        </Text>
      </Section>

      <Text
        style={{ margin: '20px 0 24px', fontSize: 14, color: emailTheme.ink }}
      >
        New wallet balance: <strong>{balance}</strong>
      </Text>

      <EmailButton href={withdrawUrl}>Withdraw Now</EmailButton>

      <SecurityNote />
    </EmailLayout>
  );
}

export default TradeApproved;
