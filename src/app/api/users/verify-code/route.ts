import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { verifySchema } from "@/schemas/verifySchema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email query parameter is required",
        },
        { status: 400 },
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification code is required",
        },
        { status: 400 },
      );
    }

    const result = verifySchema.safeParse(body);

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

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 400 },
      );
    }

    const isCodeValid = user.verifyCode === code;
    const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();

    if (isCodeValid && isCodeNotExpired) {
      user.isVerified = true;
      user.verifyCode = "";
      user.verifyCodeExpiry = new Date(0);
      await user.save();

      return NextResponse.json(
        {
          success: true,
          message: "Account verified successfully",
        },
        { status: 200 },
      );
    } else if (!isCodeNotExpired) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Verification code has expired, please sign up again to get new code",
        },
        { status: 400 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect Verification code",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error occured while verifying user",
      },
      { status: 500 },
    );
  }
}
