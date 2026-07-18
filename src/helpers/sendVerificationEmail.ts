import { getResendClient } from "@/lib/resend";
import { VerificationEmail } from "@/emails/VerificationEmail";

export async function sendVerificationEmail(
  name: string,
  email: string,
  verifyUrl: string,
  verifyCode: string,
) {
  try {
    const resend = getResendClient();

    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Cognix | Verification Code",
      react: VerificationEmail({ name, verifyUrl, otp: verifyCode }),
    });

    if (error) {
      return { success: false, message: "Error sending verification email" };
    }

    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    console.error("Error sending verification email", error);
    return { success: false, message: "Failed to send verification email" };
  }
}
