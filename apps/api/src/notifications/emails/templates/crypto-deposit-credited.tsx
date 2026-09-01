import { Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { SecurityNote } from '../components/security-note';
import { emailTheme } from '../components/theme';

export interface CryptoDepositCreditedProps {
  name: string;
  amount: string;
  balance: string;
}

// Sent when an admin confirms a crypto deposit landed (the manual-check
// half of the hybrid deposit-confirmation model, docs/product-rules.md
// rule 16) - a separate template from WalletCredited since this credits
// the user's real held crypto_wallets balance, never the fiat wallet.
export function CryptoDepositCredited({
  name,
  amount,
  balance,
}: CryptoDepositCreditedProps) {
  return (
    <EmailLayout previewText="Your Veyro crypto balance has been credited">
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        Hey {name},
        <br />
        Veyro has confirmed your deposit and credited your held balance.
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
          Amount credited
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: emailTheme.success,
          }}
        >
          {amount}
        </Text>
      </Section>

      <Text style={{ margin: '20px 0 0', fontSize: 14, color: emailTheme.ink }}>
        New balance: <strong>{balance}</strong>
      </Text>

      <Text
        style={{
          margin: '20px 0 0',
          fontSize: 14,
          lineHeight: '22px',
          color: emailTheme.ink,
        }}
      >
        This balance is yours to sell or withdraw whenever you're ready. If you
        have questions about this credit, contact Support.
      </Text>

      <SecurityNote />
    </EmailLayout>
  );
}

export default CryptoDepositCredited;
