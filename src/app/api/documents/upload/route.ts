import { getDataFromToken } from "@/helpers/getDataFromToken";
import dbConnect from "@/lib/dbConnect";
import { ingestPDF } from "@/lib/rag";
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

    // Ingestion
    const { totalChunks } = await ingestPDF(
      buffer,
      userDocument._id.toString(),
      userId,
    );

    // Update document with total chunks and status
    userDocument.totalChunks = totalChunks;
    userDocument.status = "ready";
    await userDocument.save();

    return NextResponse.json(
      {
        success: true,
        message: "Document uploaded and processed successfully",
        data: {
          documentId: userDocument._id,
          fileName: userDocument.fileName,
          totalChunks: userDocument.totalChunks,
          status: userDocument.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.log("Error uploading document", error);

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
