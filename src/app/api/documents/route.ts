import dbConnect from "@/lib/dbConnect";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import UserDocument from "@/models/UserDocument";

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

    const documents = await UserDocument.find({ userId });

    return NextResponse.json(
      {
        success: true,
        message: "Documents fetched successfully",
        data: documents,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching documents", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve documents" },
      { status: 500 },
    );
  }
}
