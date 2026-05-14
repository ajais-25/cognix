import { PasswordResetConfirmationEmail } from "@/emails/PasswordResetConfirmationEmail";
import { getResendClient } from "@/lib/resend";

export async function sendPasswordResetConfirmationEmail(
  name: string,
  email: string,
  resetDate: string,
  supportEmail: string,
) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "EduLink | Password Reset Confirmation",
      react: PasswordResetConfirmationEmail({ name, resetDate, supportEmail }),
    });

    // console.log("Email Data: ", data);

    if (error) {
      return {
        success: false,
        message: "Error sending password reset confirmation email",
      };
    }

    return {
      success: true,
      message: "Password reset confirmation email sent successfully",
    };
  } catch (error) {
    console.error("Error sending password reset confirmation email", error);
    return {
      success: false,
      message: "Failed to send password reset confirmation email",
    };
  }
}
