import { Section, Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface CryptoAwaitingDepositProps {
  name: string;
  asset: string;
  network: string;
  depositAddress: string;
  submitProofUrl: string;
}

export function CryptoAwaitingDeposit({
  name,
  asset,
  network,
  depositAddress,
  submitProofUrl,
}: CryptoAwaitingDepositProps) {
  return (
    <EmailLayout previewText="Waiting for your deposit">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        Waiting for your deposit
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
        We&apos;re watching for your {asset} deposit on {network}.
      </Text>

      <Section
        style={{
          backgroundColor: emailTheme.background,
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <Text
          style={{ margin: '0 0 8px', fontSize: 13, color: emailTheme.muted }}
        >
          Send to
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: emailTheme.ink,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {depositAddress}
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
        Once sent, submit your transaction hash and proof of deposit in the app
        so we can confirm.
      </Text>

      <EmailButton href={submitProofUrl}>Submit Proof of Deposit</EmailButton>
    </EmailLayout>
  );
}

export default CryptoAwaitingDeposit;
