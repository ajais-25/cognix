import { getDataFromToken } from "@/helpers/getDataFromToken";
import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
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

    const conversations = await Conversation.find({ userId }).sort({
      updatedAt: -1,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Conversations fetched successfully",
        data: conversations,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error in /api/conversations:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occured while fetching conversations",
      },
      { status: 500 },
    );
  }
}
