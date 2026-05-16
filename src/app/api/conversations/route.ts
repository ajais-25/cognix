import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import { NextResponse } from "next/server";

export async function GET() {
  await dbConnect();

  try {
    // TODO: Replace with actual userId from auth middleware, Dummy for now
    const userId = "683e0a4b8f1c2d3e4f5a6b7c";

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
    console.log("Error", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occured while fetching conversations",
      },
      { status: 500 },
    );
  }
}
