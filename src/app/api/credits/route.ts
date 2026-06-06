import { getDataFromToken } from "@/helpers/getDataFromToken";
import { isLowBalance } from "@/lib/credits";
import dbConnect from "@/lib/dbConnect";
import CreditTransaction from "@/models/CreditTransaction";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = getDataFromToken(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - Invalid or expired token",
        },
        { status: 401 },
      );
    }

    await dbConnect();

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized user",
        },
        { status: 401 },
      );
    }

    const hasLowBalance = isLowBalance(user.credits);

    const transactions = await CreditTransaction.find({ userId });

    return NextResponse.json(
      {
        success: true,
        message: "Credit Transaction fetched successfully",
        data: {
          credits: parseFloat(user.credits.toFixed(2)),
          lowBalance: hasLowBalance,
          transactions,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error in credits route", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error occured while fetching credits",
      },
      { status: 500 },
    );
  }
}
