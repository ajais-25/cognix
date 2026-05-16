import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";
import { NextResponse } from "next/server";

export async function GET({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  await dbConnect();

  try {
    const { conversationId } = await params;

    const messages = await Message.find({ conversationId });

    return NextResponse.json(
      {
        success: true,
        message: "Conversation fetched successfully",
        data: messages,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occured while fetching conversation",
      },
      { status: 500 },
    );
  }
}
