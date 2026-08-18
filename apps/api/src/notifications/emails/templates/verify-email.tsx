import { OtpCodeLayout } from '../components/otp-code-layout';

export interface VerifyEmailProps {
  name?: string;
  code: string;
  expiryMinutes: number;
}

export function VerifyEmail({ name, code, expiryMinutes }: VerifyEmailProps) {
  return (
    <OtpCodeLayout
      previewText="Your Veyro verification code"
      heading="Verify your email"
      name={name}
      intro="Enter this code to verify your email and activate your Veyro account."
      code={code}
      expiryMinutes={expiryMinutes}
    />
  );
}

export default VerifyEmail;
