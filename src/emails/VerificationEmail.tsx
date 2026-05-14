import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import { Header } from "./components/Header";
import { Button } from "./components/Button";
import { Footer } from "./components/Footer";
import {
  baseStyles,
  typography,
  components,
  layout,
  alerts,
  lists,
  iconSection,
  emailIcon,
  otpContainer,
  otpLabel,
  otpBox,
  otpCode,
  otpHelper,
} from "./styles/styles";

interface VerificationEmailProps {
  name: string;
  otp: string;
  verifyUrl: string;
  expiryTime?: string;
}

export const VerificationEmail = ({
  name,
  otp,
  verifyUrl,
  expiryTime = "10 minutes",
}: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address - OTP: {otp}</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Header />

          <Section style={baseStyles.content}>
            {/* Email Icon */}
            <Section style={iconSection}>
              <Text style={emailIcon}>📧</Text>
            </Section>

            <Heading style={typography.heading}>
              Verify Your Email Address
            </Heading>

            <Text style={typography.paragraph}>Hi {name},</Text>

            <Text style={typography.paragraph}>
              Thank you for signing up! To complete your registration and
              activate your account, please verify your email address using the
              OTP code below.
            </Text>

            {/* OTP Display */}
            <Section style={otpContainer}>
              <Text style={otpLabel}>Your Verification Code</Text>
              <Section style={otpBox}>
                <Text style={otpCode}>{otp}</Text>
              </Section>
              <Text style={otpHelper}>
                Enter this code on the verification page
              </Text>
            </Section>

            {/* Verify Button */}
            <Section style={layout.centered}>
              <Button href={verifyUrl}>Verify Email Now</Button>
            </Section>

            <Text
              style={{
                ...typography.small,
                textAlign: "center" as const,
                color: "#6b7280",
                margin: "16px 0",
              }}
            >
              Or manually enter the code on the verification page
            </Text>

            <Hr style={components.hr} />

            {/* Info Box */}
            <Section style={alerts.info.container}>
              <Text style={alerts.info.title}>📝 Important Information</Text>
              <Text style={alerts.info.text}>
                <strong>• This code will expire in {expiryTime}</strong>
              </Text>
              <Text style={alerts.info.text}>
                • This code can only be used once
              </Text>
              <Text style={alerts.info.text}>
                • Don't share this code with anyone
              </Text>
            </Section>

            <Hr style={components.hr} />

            {/* Security Warning */}
            <Section style={alerts.warning.container}>
              <Text style={alerts.warning.title}>⚠️ Didn't sign up?</Text>
              <Text style={alerts.warning.text}>
                If you didn't create an account, please ignore this email. Your
                email address will not be used without verification.
              </Text>
            </Section>

            <Hr style={components.hr} />

            {/* Why Verify */}
            <Section style={lists.container}>
              <Text style={lists.title}>🔐 Why do we verify emails?</Text>
              <ul style={lists.ul}>
                <li style={lists.li}>Ensures account security</li>
                <li style={lists.li}>Confirms you own this email address</li>
                <li style={lists.li}>Helps us send you important updates</li>
                <li style={lists.li}>Protects against unauthorized access</li>
              </ul>
            </Section>

            <Text
              style={{
                ...typography.small,
                textAlign: "center" as const,
                marginTop: "32px",
              }}
            >
              Need help? Contact our support team at{" "}
              <Link href="mailto:support@yourapp.com" style={components.link}>
                support@yourapp.com
              </Link>
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
};
