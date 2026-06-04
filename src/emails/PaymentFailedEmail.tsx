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
  boxes,
  layout,
  detailsBox,
  alerts,
} from "./styles/styles";

interface PaymentFailedEmailProps {
  userName: string;
  amount: string;
  currency?: string;
  orderId?: string;
  retryLink: string;
}

export const PaymentFailedEmail = ({
  userName,
  amount,
  currency = "INR",
  orderId,
  retryLink,
}: PaymentFailedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Payment failed for your Cognix credit top-up — please try again.</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Header />

          <Section style={baseStyles.content}>
            <Section style={{ textAlign: "center" as const, margin: "20px 0" }}>
              <Text style={{ fontSize: "64px", margin: "0" }}>❌</Text>
            </Section>

            <Heading style={typography.heading}>Payment Failed</Heading>

            <Text style={typography.paragraph}>Hi {userName},</Text>

            <Text style={typography.paragraph}>
              Unfortunately, your payment for credit top-up could not be processed. Don&apos;t worry — you can try again and complete your transaction.
            </Text>

            <Section style={detailsBox.container}>
              <Text style={detailsBox.title}>📋 Payment Details</Text>
              <table style={detailsBox.table}>
                <tbody>
                  <tr>
                    <td style={detailsBox.label}>Item</td>
                    <td style={detailsBox.value}>Cognix Credits Top-up</td>
                  </tr>
                  <tr>
                    <td style={detailsBox.label}>Amount</td>
                    <td style={detailsBox.value}>
                      {currency} {amount}
                    </td>
                  </tr>
                  {orderId && (
                    <tr>
                      <td style={detailsBox.label}>Order ID</td>
                      <td style={detailsBox.value}>{orderId}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={detailsBox.label}>Status</td>
                    <td
                      style={{
                        ...detailsBox.value,
                        color: "#DC2626",
                        fontWeight: "700",
                      }}
                    >
                      Failed
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={layout.centered}>
              <Button href={retryLink}>Retry Payment</Button>
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
              <Link href={retryLink} style={components.link}>
                {retryLink}
              </Link>
            </Text>

            <Hr style={components.hr} />

            <Section style={alerts.warning.container}>
              <Text style={alerts.warning.title}>
                ⚠️ Why did the payment fail?
              </Text>
              <Text style={alerts.warning.text}>
                Common reasons for payment failure include:
              </Text>
              <Text
                style={{
                  ...alerts.warning.text,
                  margin: "4px 0",
                }}
              >
                • Insufficient funds in your account.
              </Text>
              <Text
                style={{
                  ...alerts.warning.text,
                  margin: "4px 0",
                }}
              >
                • Card declined by the issuing bank.
              </Text>
              <Text
                style={{
                  ...alerts.warning.text,
                  margin: "4px 0",
                }}
              >
                • Incorrect card or UPI details entered.
              </Text>
              <Text
                style={{
                  ...alerts.warning.text,
                  margin: "4px 0",
                }}
              >
                • Network or connectivity issues during payment.
              </Text>
            </Section>

            <Hr style={components.hr} />

            <Section style={boxes.info}>
              <Text
                style={{
                  ...typography.small,
                  color: "#1e40af",
                  margin: "8px 0",
                }}
              >
                <strong>💡 Need help?</strong> If the problem persists, try
                using a different payment method or contact your bank. You can
                also reach out to our support team for assistance.
              </Text>
            </Section>

            <Hr style={components.hr} />

            <Text style={{ ...typography.small, textAlign: "center" as const }}>
              No amount has been deducted from your account. If you see any
              charges, they will be automatically refunded within 5–7 business
              days.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentFailedEmail;
