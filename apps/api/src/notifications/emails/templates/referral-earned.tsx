import { Text } from '@react-email/components';
import { EmailButton } from '../components/email-button';
import { EmailLayout } from '../components/email-layout';
import { emailTheme } from '../components/theme';

export interface ReferralEarnedProps {
  name: string;
  referredUserName: string;
  bonusAmount: string;
  viewReferralsUrl: string;
}

export function ReferralEarned({
  name,
  referredUserName,
  bonusAmount,
  viewReferralsUrl,
}: ReferralEarnedProps) {
  return (
    <EmailLayout previewText="You just earned a referral bonus">
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: 22,
          fontWeight: 600,
          color: emailTheme.ink,
        }}
      >
        You just earned a referral bonus
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
        {referredUserName} just completed their first trade, you&apos;ve earned{' '}
        {bonusAmount}.
      </Text>

      <EmailButton href={viewReferralsUrl}>View Referrals</EmailButton>
    </EmailLayout>
  );
}

export default ReferralEarned;
