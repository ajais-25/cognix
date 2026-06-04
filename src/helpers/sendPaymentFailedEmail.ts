import { getResendClient } from "@/lib/resend";
import PaymentFailedEmail from "@/emails/PaymentFailedEmail";

export async function sendPaymentFailedEmail(
  userName: string,
  userEmail: string,
  amount: string,
  currency: string,
  orderId: string,
  retryLink: string,
) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: userEmail,
      subject: "Cognix | Payment Failed",
      react: PaymentFailedEmail({
        userName,
        amount,
        currency,
        orderId,
        retryLink,
      }),
    });

    if (error) {
      return { success: false, message: "Error sending payment failed email" };
    }

    return {
      success: true,
      message: "Payment failed email sent successfully",
    };
  } catch (error) {
    console.error("Error sending payment failed email", error);
    return { success: false, message: "Failed to send payment failed email" };
  }
}
