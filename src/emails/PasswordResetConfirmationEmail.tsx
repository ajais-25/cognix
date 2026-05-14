import {
  Body,
  Container,
  Head,
  Heading,
  Html,
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
  layout,
  detailsBox,
  icons,
  alerts,
  lists,
} from "./styles/styles";

interface PasswordResetConfirmationEmailProps {
  name: string;
  resetDate?: string;
  supportEmail?: string;
}

export const PasswordResetConfirmationEmail = ({
  name,
  resetDate = new Date().toLocaleString(),
  supportEmail = "",
}: PasswordResetConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your password has been changed</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Header />

          <Section style={baseStyles.content}>
            {/* Success Icon */}
            <Section style={icons.section}>
              <Text style={icons.success}>✅</Text>
            </Section>

            <Heading style={typography.heading}>
              Password Changed Successfully
            </Heading>

            <Text style={typography.paragraph}>Hi {name},</Text>

            <Text style={typography.paragraph}>
              This email confirms that your password has been successfully
              changed.
            </Text>

            {/* Details Box */}
            <Section style={detailsBox.container}>
              <Text style={detailsBox.title}>Reset Details:</Text>
              <table style={detailsBox.table}>
                <tbody>
                  <tr>
                    <td style={detailsBox.label}>Date & Time:</td>
                    <td style={detailsBox.value}>{resetDate}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Hr style={components.hr} />

            {/* Security Warning */}
            <Section style={alerts.warning.container}>
              <Text style={alerts.warning.title}>
                ⚠️ Didn't make this change?
              </Text>
              <Text style={alerts.warning.text}>
                If you didn't reset your password, your account may be
                compromised. Please contact our support team immediately.
              </Text>
              <Section style={layout.centered}>
                <Button href={`mailto:${supportEmail}`} variant="danger">
                  Contact Support
                </Button>
              </Section>
            </Section>

            <Hr style={components.hr} />

            {/* Security Tips */}
            <Section style={lists.container}>
              <Text style={lists.title}>🔐 Security Tips:</Text>
              <ul style={lists.ul}>
                <li style={lists.li}>Use a strong, unique password</li>
                <li style={lists.li}>Enable two-factor authentication</li>
                <li style={lists.li}>Never share your password with anyone</li>
                <li style={lists.li}>Be cautious of phishing emails</li>
              </ul>
            </Section>

            <Text
              style={{
                ...typography.small,
                textAlign: "center" as const,
                marginTop: "32px",
              }}
            >
              Thank you for keeping your account secure.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
};
