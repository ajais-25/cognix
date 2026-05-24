import { getDataFromToken } from "@/helpers/getDataFromToken";
import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
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

    const { conversationId } = await params;

    const isUserCoversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });

    if (!isUserCoversation) {
      return NextResponse.json(
        {
          success: false,
          message: "Conversation not found or you don't have access to it",
        },
        { status: 404 },
      );
    }

    const messages = await Message.find({ conversationId }).sort({
      createdAt: 1,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Conversation fetched successfully",
        data: {
          conversation: isUserCoversation,
          messages,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error in /api/conversations/[conversationId]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occured while fetching conversation",
      },
      { status: 500 },
    );
  }
}
