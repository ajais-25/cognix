import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { signInSchema } from "@/schemas/signInSchema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const generateAuthToken = (_id: Types.ObjectId): string => {
  const secret = process.env.JWT_SECRET!;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ _id: _id.toString() }, secret, {
    expiresIn: "7d",
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
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

    const result = signInSchema.safeParse(body);

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

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified === false) {
        return NextResponse.json(
          {
            success: false,
            message:
              "User not verified. Please verify your email by signing up",
          },
          {
            status: 400,
          },
        );
      }

      const isPasswordCorrect = await bcrypt.compare(
        password,
        existingUser.password,
      );

      if (!isPasswordCorrect) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid credentials",
          },
          {
            status: 400,
          },
        );
      }

      const token = generateAuthToken(existingUser._id as Types.ObjectId);

      const cookieStore = await cookies();
      cookieStore.set("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json(
        {
          success: true,
          message: "User Logged In successfully",
          data: {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            isVerified: existingUser.isVerified,
          },
        },
        {
          status: 200,
        },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        {
          status: 400,
        },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error while logging in",
      },
      {
        status: 500,
      },
    );
  }
}
