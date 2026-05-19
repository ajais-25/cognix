import { getDataFromToken } from "@/helpers/getDataFromToken";
import dbConnect from "@/lib/dbConnect";
import { gemini } from "@/lib/gemini";
import { retrieveChunks } from "@/lib/rag";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import UserDocument from "@/models/UserDocument";
import { PDF_RAG_PROMPT_TEMPLATE, PDF_RAG_SYSTEM_PROMPT } from "@/prompt";
import { documentAskSchema } from "@/schemas/documentAskSchema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(
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

    const { query, conversationId } = await request.json();
    const { documentId } = await params;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: "Query is required",
        },
        {
          status: 400,
        },
      );
    }

    const result = documentAskSchema.safeParse({ query, conversationId });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query format",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    if (conversationId) {
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
    }

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

    if (document.status !== "ready") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Document is not ready for querying yet. Please try again later.",
        },
        { status: 400 },
      );
    }

    const results = await retrieveChunks(
      query,
      document._id.toString(),
      userId,
    );

    const context = results.map((result) => result.content).join("\n\n");

    const prompt = PDF_RAG_PROMPT_TEMPLATE.replace(
      "{{DOCUMENT_CONTEXT}}",
      context,
    ).replace("{{USER_QUERY}}", query);

    // Stream the answer as plain text (no JSON schema)
    const stream = await gemini.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: PDF_RAG_SYSTEM_PROMPT,
      },
    });

    const encoder = new TextEncoder();

    // Helper to send an SSE event
    const sse = (data: string) => encoder.encode(`data: ${data}\n\n`);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 1. Stream answer chunks as plain text
          let fullAnswer = "";

          for await (const chunk of stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullAnswer += text;
              controller.enqueue(
                sse(JSON.stringify({ type: "text", data: text })),
              );
            }
          }

          // 2. Save conversation and messages to DB
          try {
            let convId = conversationId;

            if (!convId) {
              const conversation = await Conversation.create({
                userId,
                title: query.length > 60 ? query.slice(0, 57) + "..." : query,
              });
              convId = conversation._id;
            }

            await Message.insertMany([
              {
                conversationId: convId,
                role: "user",
                documentId: document._id,
                content: query,
              },
              {
                conversationId: convId,
                role: "assistant",
                content: fullAnswer,
                documentId: document._id,
              },
            ]);

            // Send conversationId so the client can continue this chat
            controller.enqueue(
              sse(
                JSON.stringify({
                  type: "meta",
                  data: { conversationId: convId },
                }),
              ),
            );
          } catch (dbError) {
            console.error("Failed to save to DB:", dbError);
          }

          // 3. Signal stream end
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.log("Error in /api/documents/[documentId]/ask:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occured while asking from document",
      },
      { status: 500 },
    );
  }
}
