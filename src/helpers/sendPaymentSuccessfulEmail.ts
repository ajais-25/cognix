import { getResendClient } from "@/lib/resend";
import PaymentSuccessfulEmail from "@/emails/PaymentSuccessfulEmail";

export async function sendPaymentSuccessfulEmail(
  userName: string,
  userEmail: string,
  amount: string,
  currency: string,
  orderId: string,
  creditsAdded: number,
) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: userEmail,
      subject: "Cognix | Payment Successful",
      react: PaymentSuccessfulEmail({
        userName,
        amount,
        currency,
        orderId,
        creditsAdded,
      }),
    });

    if (error) {
      return { success: false, message: "Error sending payment successful email" };
    }

    return {
      success: true,
      message: "Payment successful email sent successfully",
    };
  } catch (error) {
    console.error("Error sending payment successful email", error);
    return { success: false, message: "Failed to send payment successful email" };
  }
}
