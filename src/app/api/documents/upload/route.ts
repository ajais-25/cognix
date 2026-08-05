import { getDataFromToken } from "@/helpers/getDataFromToken";
import { MINIMUM_REQUIRED_BALANCE } from "@/lib/credits";
import dbConnect from "@/lib/dbConnect";
import { queuePdfProcessing } from "@/lib/queue";
import { uploadPdf } from "@/lib/storage";
import User from "@/models/User";
import UserDocument from "@/models/UserDocument";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let userDocument;

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

    if (user.credits < MINIMUM_REQUIRED_BALANCE) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient credits to complete this query. Please top up.",
          data: {
            creditsRemaining: parseFloat(user.credits.toFixed(4)),
            minimumRequiredUsd: MINIMUM_REQUIRED_BALANCE,
          },
        },
        { status: 402 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.slice(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        {
          success: false,
          message: "Not a valid PDF",
        },
        { status: 400 },
      );
    }

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File size must be <= 25 MB",
        },
        { status: 400 },
      );
    }

    const key = `pdfs/${crypto.randomUUID()}-${file.name.replaceAll(" ", "_")}`;

    await uploadPdf(buffer, key);

    userDocument = await UserDocument.create({
      userId,
      b2Key: key,
      fileName: file.name,
      fileSize: buffer.length,
      status: "pending",
    });

    await queuePdfProcessing(userId, userDocument._id.toString(), key);

    return NextResponse.json(
      {
        success: true,
        message: "Document uploaded successfully",
        data: {
          documentId: userDocument._id,
          fileName: userDocument.fileName,
          status: userDocument.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.log("Error in /api/documents/upload:", error);
    if (userDocument?._id) {
      try {
        await UserDocument.findByIdAndDelete(userDocument._id);
      } catch (cleanupErr) {
        console.error("Cleanup failed:", cleanupErr);
      }
    }
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload document",
      },
      { status: 500 },
    );
  }
}
