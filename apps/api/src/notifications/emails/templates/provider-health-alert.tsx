import { Text } from '@react-email/components';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface ProviderHealthAlertProps {
  networkCode: string;
  provider: string;
  status: 'available' | 'unavailable';
  detail: string | null;
  occurredAt: string;
}

// Ops-facing alert (ProviderHealthService's alertTransition) - the first
// internal/admin template in this file, everything else here is
// user-facing. Sent only on a status TRANSITION (never per failed
// request): once when a network/provider trips to unavailable (deposits
// into it are hidden immediately, see network_availability's design), and
// once when it's later confirmed recovered - either by a real successful
// call or the scheduled recovery probe, without any admin action.
export function ProviderHealthAlert({
  networkCode,
  provider,
  status,
  detail,
  occurredAt,
}: ProviderHealthAlertProps) {
  const isDown = status === 'unavailable';
  return (
    <EmailLayout
      previewText={
        isDown
          ? `${provider}/${networkCode} deposit detection is unavailable`
          : `${provider}/${networkCode} deposit detection has recovered`
      }
    >
      <Text
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: '24px',
          color: emailTheme.ink,
        }}
      >
        {isDown ? (
          <>
            <strong>{provider}</strong> can no longer reliably detect
            deposits for <strong>{networkCode}</strong>. That network has
            been automatically hidden as a deposit option so nothing lands
            somewhere it can&apos;t currently be tracked. It will re-enable
            itself automatically once {provider} recovers - no action
            needed unless it stays down longer than expected.
          </>
        ) : (
          <>
            <strong>{provider}</strong> deposit detection for{' '}
            <strong>{networkCode}</strong> has recovered and is deposit-able
            again, automatically.
          </>
        )}
      </Text>
      {detail ? (
        <Text
          style={{
            margin: '12px 0 0',
            fontSize: 13,
            lineHeight: '20px',
            color: emailTheme.muted,
            fontFamily: 'monospace',
          }}
        >
          {detail}
        </Text>
      ) : null}
      <Text
        style={{
          margin: '12px 0 0',
          fontSize: 13,
          lineHeight: '20px',
          color: emailTheme.muted,
        }}
      >
        {occurredAt}
      </Text>
    </EmailLayout>
  );
}

export default ProviderHealthAlert;
