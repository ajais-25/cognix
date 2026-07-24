import { getDataFromToken } from "@/helpers/getDataFromToken";
import { deductUploadCredits, MINIMUM_REQUIRED_BALANCE } from "@/lib/credits";
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

    const freshUser = await User.findById(userId).select("credits").lean();
    const currentCredits =
      (freshUser as { credits?: number } | null)?.credits ?? user.credits;

    if (currentCredits < MINIMUM_REQUIRED_BALANCE) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient credits to process document upload. Please top up.`,
          data: {
            creditsRemaining: parseFloat(currentCredits.toFixed(4)),
            minimumRequiredUsd: MINIMUM_REQUIRED_BALANCE,
          },
        },
        { status: 402 },
      );
    }

    userDocument = await UserDocument.create({
      userId,
      fileName: filename,
      fileSize: file.size,
    });

    // Split PDF
    const taggedChunks = await splitPDF(
      buffer,
      userDocument._id.toString(),
      userId,
    );

    if (!taggedChunks || taggedChunks.length === 0) {
      await UserDocument.findByIdAndDelete(userDocument._id);

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not extract text from PDF. Please upload a searchable PDF with text content.",
        },
        { status: 400 },
      );
    }

    const totalChunks = taggedChunks.length;

    // Embedding & title generation
    const { title, itemizedCalls } = await embedChunks(taggedChunks);

    // Update document with total chunks and status
    userDocument.totalChunks = totalChunks;
    userDocument.status = "ready";
    await userDocument.save();

    const { creditsDeducted, newBalance, lowBalance } =
      await deductUploadCredits({
        userId,
        balance: currentCredits,
        itemizedCalls,
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
          title,
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
        message: "Failed to process document upload",
      },
      { status: 500 },
    );
  }
}
