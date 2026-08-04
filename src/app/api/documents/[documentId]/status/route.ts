import { getDataFromToken } from "@/helpers/getDataFromToken";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import UserDocument from "@/models/UserDocument";
import { NextRequest, NextResponse } from "next/server";

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

    const doc = await UserDocument.findOne({
      _id: documentId,
      userId,
    }).select("fileName fileSize status createdAt updatedAt");

    if (!doc) {
      return NextResponse.json(
        {
          success: false,
          message: "Document not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Document found",
        data: doc,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/documents/[documentId]/status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch document status",
      },
      { status: 500 },
    );
  }
}
