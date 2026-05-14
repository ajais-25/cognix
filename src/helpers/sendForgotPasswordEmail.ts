import ForgotPasswordEmail from "@/emails/ForgotPasswordEmail";
import { getResendClient } from "@/lib/resend";

export async function sendForgotPasswordEmail(
  email: string,
  resetLink: string,
  expiryTime: string,
) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "EduLink | Reset Password",
      react: ForgotPasswordEmail({ resetLink, expiryTime }),
    });

    // console.log("Email Data: ", data);

    if (error) {
      return { success: false, message: "Error sending password reset email" };
    }

    return { success: true, message: "Password reset email sent successfully" };
  } catch (error) {
    console.error("Error sending password reset email", error);
    return { success: false, message: "Failed to send password reset email" };
  }
}
