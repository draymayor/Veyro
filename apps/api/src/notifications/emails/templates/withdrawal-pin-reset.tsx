import { OtpCodeLayout } from '../components/otp-code-layout';

export interface WithdrawalPinResetProps {
  name?: string;
  code: string;
  expiryMinutes: number;
}

export function WithdrawalPinReset({
  name,
  code,
  expiryMinutes,
}: WithdrawalPinResetProps) {
  return (
    <OtpCodeLayout
      previewText="Reset your Veyro withdrawal PIN"
      heading="Reset your withdrawal PIN"
      name={name}
      intro="Enter this code to set a new withdrawal PIN. Your withdrawal PIN is separate from your account password and two-factor authentication."
      code={code}
      expiryMinutes={expiryMinutes}
      footnote="Didn't request this? You can safely ignore this email and your withdrawal PIN will stay the same."
    />
  );
}

export default WithdrawalPinReset;
