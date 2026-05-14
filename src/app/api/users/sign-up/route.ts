import dbConnect from "@/lib/dbConnect";
import { signUpSchema } from "@/schemas/signUpSchema";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import z from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        {
          status: 400,
        },
      );
    }

    const result = signUpSchema.safeParse(body);

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

    const existingUserByEmail = await User.findOne({ email });

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (existingUserByEmail) {
      if (existingUserByEmail.isVerified) {
        return Response.json(
          {
            success: false,
            message: "User already exists with this email",
          },
          { status: 400 },
        );
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUserByEmail.password = hashedPassword;

        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);

        existingUserByEmail.verifyCode = verifyCode;
        existingUserByEmail.verifyCodeExpiry = expiryDate;

        await existingUserByEmail.save();
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry: expiryDate,
        isVerified: false,
      });

      await newUser.save();
    }

    const verifyUrl = `${process.env.DOMAIN_URL!}/verify-code?email=${email}`;

    const verificationEmailResult = await sendVerificationEmail(
      name,
      email,
      verifyUrl,
      verifyCode,
    );

    if (!verificationEmailResult.success) {
      console.warn(
        `Sign-up succeeded but verification email failed for ${email}: ${verificationEmailResult.message}`,
      );
    }

    return Response.json(
      {
        success: true,
        message: verificationEmailResult.success
          ? "User registered successfully"
          : "User registered successfully, but verification email could not be sent. Please try requesting a new code.",
        emailSent: verificationEmailResult.success,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error registering user",
      },
      {
        status: 500,
      },
    );
  }
}
