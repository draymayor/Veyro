import { OtpCodeLayout } from '../components/otp-code-layout';

export interface PasswordResetProps {
  name?: string;
  code: string;
  expiryMinutes: number;
}

export function PasswordReset({
  name,
  code,
  expiryMinutes,
}: PasswordResetProps) {
  return (
    <OtpCodeLayout
      previewText="Reset your Veyro password"
      heading="Reset your password"
      name={name}
      intro="Enter this code to reset your Veyro password."
      code={code}
      expiryMinutes={expiryMinutes}
      footnote="Didn't request this? You can safely ignore this email and your password will stay the same."
    />
  );
}

export default PasswordReset;
