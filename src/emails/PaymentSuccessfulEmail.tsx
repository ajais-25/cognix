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
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import {
  baseStyles,
  typography,
  components,
  detailsBox,
  boxes,
} from "./styles/styles";

interface PaymentSuccessfulEmailProps {
  userName: string;
  amount: string;
  currency?: string;
  orderId?: string;
  creditsAdded: number;
}

export const PaymentSuccessfulEmail = ({
  userName,
  amount,
  currency = "INR",
  orderId,
  creditsAdded,
}: PaymentSuccessfulEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Payment successful — {creditsAdded.toString()} credits have been added to your Cognix account.</Preview>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Header />

          <Section style={baseStyles.content}>
            <Section style={{ textAlign: "center" as const, margin: "20px 0" }}>
              <Text style={{ fontSize: "64px", margin: "0" }}>✅</Text>
            </Section>

            <Heading style={typography.heading}>Payment Successful</Heading>

            <Text style={typography.paragraph}>Hi {userName},</Text>

            <Text style={typography.paragraph}>
              Your payment has been successfully processed and{" "}
              <strong>{creditsAdded} credits</strong> have been added to your
              Cognix account. You can start using them right away!
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
                    <td style={detailsBox.label}>Credits Added</td>
                    <td
                      style={{
                        ...detailsBox.value,
                        color: "#16A34A",
                        fontWeight: "700",
                      }}
                    >
                      +{creditsAdded}
                    </td>
                  </tr>
                  <tr>
                    <td style={detailsBox.label}>Status</td>
                    <td
                      style={{
                        ...detailsBox.value,
                        color: "#16A34A",
                        fontWeight: "700",
                      }}
                    >
                      Successful
                    </td>
                  </tr>
                </tbody>
              </table>
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
                <strong>💡 Tip:</strong> Your credits never expire and can be
                used across all Cognix features including AI conversations,
                document analysis, and more.
              </Text>
            </Section>

            <Hr style={components.hr} />

            <Text style={{ ...typography.small, textAlign: "center" as const }}>
              This is a confirmation of your payment. If you did not make this
              transaction, please contact our support team immediately.
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentSuccessfulEmail;
