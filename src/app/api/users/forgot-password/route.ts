import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { generateRandomToken } from "@/helpers/generateRandomToken";
import PasswordReset from "@/models/PasswordReset";
import { sendForgotPasswordEmail } from "@/helpers/sendForgotPasswordEmail";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/schemas/forgotPasswordSchema";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid email",
        },
        { status: 400 },
      );
    }

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email format",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: "If the email exists, a reset link has been sent",
        },
        { status: 200 },
      );
    }

    const resetToken = generateRandomToken();
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    const resetLink = `${process.env.DOMAIN_URL!}/reset-password?token=${resetToken}`;

    const passwordReset = new PasswordReset({
      userId: user._id,
      token: hashedToken,
      expiresAt,
      isUsed: false,
    });

    await passwordReset.save();

    const forgotPasswordEmailResult = await sendForgotPasswordEmail(
      email,
      resetLink,
      "15 minutes",
    );

    if (!forgotPasswordEmailResult.success) {
      console.warn(
        `Forgot-password token created but email failed for ${email}: ${forgotPasswordEmailResult.message}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "If the email exists, a reset link has been sent",
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error in forgot-password route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occured. Please try again later",
      },
      { status: 500 },
    );
  }
}
