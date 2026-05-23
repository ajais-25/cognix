import { getDataFromToken } from "@/helpers/getDataFromToken";
import { deductUploadCredits, estimateUploadCost } from "@/lib/credits";
import dbConnect from "@/lib/dbConnect";
import { embedChunks, splitPDF } from "@/lib/rag";
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

    const formData = await request.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "No files received",
        },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          success: false,
          message: "File must be in PDF format",
        },
        { status: 400 },
      );
    }

    if (file.size > 20_000_000) {
      return NextResponse.json(
        {
          success: false,
          message: "File size must be <= 20 MB",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replaceAll(" ", "_");
    console.log(filename);

    userDocument = await UserDocument.create({
      userId,
      fileName: filename,
      fileSize: file.size,
    });

    // Split
    const taggedChunks = await splitPDF(
      buffer,
      userDocument._id.toString(),
      userId,
    );
    const totalChunks = taggedChunks.length;

    const uploadCost = estimateUploadCost(totalChunks);

    const freshUser = await User.findById(userId).select("credits").lean();
    const currentCredits =
      (freshUser as { credits?: number } | null)?.credits ?? user.credits;

    if (currentCredits < uploadCost) {
      // Clean up the document record
      await UserDocument.findByIdAndDelete(userDocument._id);

      return NextResponse.json(
        {
          success: false,
          message: `Insufficient credits. This document requires ${uploadCost} credits.`,
          data: {
            creditsRemaining: currentCredits,
            uploadCost, // UI can tell user exactly how many credits to top up
          },
        },
        { status: 402 },
      );
    }

    // Embedding
    await embedChunks(taggedChunks);

    // Update document with total chunks and status
    userDocument.totalChunks = totalChunks;
    userDocument.status = "ready";
    await userDocument.save();

    const { creditsDeducted, newBalance, lowBalance } =
      await deductUploadCredits({
        userId,
        balance: currentCredits,
        totalChunks,
        referenceId: userDocument._id.toString(),
      });

    return NextResponse.json(
      {
        success: true,
        message: "Document uploaded and processed successfully",
        data: {
          documentId: userDocument._id,
          fileName: userDocument.fileName,
          totalChunks,
          status: userDocument.status,
          creditsUsed: creditsDeducted,
          creditsRemaining: newBalance,
          lowBalance,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.log("Error in /api/documents/upload:", error);

    await UserDocument.findByIdAndUpdate(userDocument?._id, {
      status: "failed",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Error occured while uploading document",
      },
      { status: 500 },
    );
  }
}
