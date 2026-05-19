import dbConnect from "@/lib/dbConnect";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import UserDocument from "@/models/UserDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
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

    const { documentId } = await params;

    const document = await UserDocument.findOne({ _id: documentId, userId });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          message: "Document not found or you don't have access to it",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Document fetched successfully",
        data: document,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching document", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve document" },
      { status: 500 },
    );
  }
}
