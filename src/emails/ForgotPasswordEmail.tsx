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
import * as React from "react";
import { Header } from "./components/Header";
import { Button } from "./components/Button";
import { Footer } from "./components/Footer";
import {
  baseStyles,
  typography,
  components,
  boxes,
  layout,
} from "./styles/styles";

interface ForgotPasswordEmailProps {
  resetLink: string;
  expiryTime?: string;
}

export const ForgotPasswordEmail = ({
  resetLink,
  expiryTime = "15 minutes",
}: ForgotPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Header />

          <Section style={baseStyles.content}>
            <Heading style={typography.heading}>Reset Your Password</Heading>

            <Text style={typography.paragraph}>Hi,</Text>

            <Text style={typography.paragraph}>
              We received a request to reset your password. If you didn't make
              this request, you can safely ignore this email.
            </Text>

            <Text style={typography.paragraph}>
              To reset your password, click the button below:
            </Text>

            <Section style={layout.centered}>
              <Button href={resetLink}>Reset Password</Button>
            </Section>

            <Text style={typography.paragraph}>
              Or copy and paste this link into your browser:
            </Text>

            <Text
              style={{
                ...typography.small,
                textAlign: "center" as const,
                wordBreak: "break-all" as const,
              }}
            >
              <Link href={resetLink} style={components.link}>
                {resetLink}
              </Link>
            </Text>

            <Hr style={components.hr} />

            <Section style={boxes.info}>
              <Text
                style={{
                  ...typography.small,
                  color: "#1e40af",
                  margin: "8px 0",
                }}
              >
                <strong>⏱️ This link will expire in {expiryTime}</strong>
              </Text>
              <Text
                style={{
                  ...typography.small,
                  color: "#1e40af",
                  margin: "8px 0",
                }}
              >
                🔒 For security reasons, we recommend you change your password
                regularly.
              </Text>
            </Section>

            <Hr style={components.hr} />

            <Text style={{ ...typography.small, textAlign: "center" as const }}>
              If you didn't request a password reset, please ignore this email
              or contact our support team if you have concerns.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
};

export default ForgotPasswordEmail;
