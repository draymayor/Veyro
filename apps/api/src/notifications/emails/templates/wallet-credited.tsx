import { Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { SecurityNote } from '../components/security-note';
import { emailTheme } from '../components/theme';

export interface WalletCreditedProps {
  name: string;
  amount: string;
  balance: string;
}

// Sent for every manual deposit (docs/admin-guide.md's Manual Deposit
// feature): an admin credited the wallet outside the normal trade flow, so
// this is the user's only notice it happened, same reasoning as
// TradeApproved's SecurityNote but phrased for an admin-initiated credit
// rather than a trade result.
export function WalletCredited({ name, amount, balance }: WalletCreditedProps) {
  return (
    <EmailLayout previewText="Your Veyro wallet has been credited">
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
        Veyro has credited your wallet.
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
        If you have questions about this credit, contact Support.
      </Text>

      <SecurityNote />
    </EmailLayout>
  );
}

export default WalletCredited;
