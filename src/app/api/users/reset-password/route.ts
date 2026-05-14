import { sendPasswordResetConfirmationEmail } from "@/helpers/sendPasswordResetConfirmationEmail";
import dbConnect from "@/lib/dbConnect";
import PasswordReset from "@/models/PasswordReset";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resetPasswordSchema } from "@/schemas/resetPasswordSchema";
import z from "zod";

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    const { newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Token and new password are required",
        },
        { status: 400 },
      );
    }

    const result = resetPasswordSchema.safeParse({ newPassword });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid password format",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const hashedToken = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const existingToken = await PasswordReset.findOne({
      token: hashedToken,
      expiresAt: {
        $gt: Date.now(),
      },
      isUsed: false,
    });

    if (!existingToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid token",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      existingToken.userId,
      {
        $set: {
          password: hashedPassword,
        },
      },
      { new: true },
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    existingToken.isUsed = true;
    await existingToken.save();

    const resetDate = new Date().toLocaleString();

    await sendPasswordResetConfirmationEmail(
      user.name,
      user.email,
      resetDate,
      process.env.SUPPORT_EMAIL! || "",
    );

    return NextResponse.json(
      {
        success: true,
        message: "Password reset succesful",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "An error occured. Please try again later",
      },
      { status: 500 },
    );
  }
}
