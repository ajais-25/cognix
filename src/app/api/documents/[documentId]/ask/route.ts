import { getDataFromToken } from "@/helpers/getDataFromToken";
import {
  CallUsageParam,
  deductQueryCredits,
  MINIMUM_REQUIRED_BALANCE,
} from "@/lib/credits";
import dbConnect from "@/lib/dbConnect";
import { models } from "@/lib/models";
import { streamAnswer } from "@/lib/rag";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import UserDocument from "@/models/UserDocument";
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

      if (isUserCoversation.type !== "document") {
        return NextResponse.json(
          {
            success: false,
            message:
              "This conversation is a chat conversation. Use the normal ask route instead.",
          },
          { status: 400 },
        );
      }

      if (isUserCoversation.documentId?.toString() !== documentId) {
        return NextResponse.json(
          {
            success: false,
            message: "This conversation belongs to a different document.",
          },
          { status: 400 },
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

    const { queryEmbeddingTokens, stream } = await streamAnswer(
      query,
      userId,
      documentId,
    );

    // Create conversation and save user message BEFORE streaming
    // so the user message gets an earlier createdAt timestamp
    let convId = conversationId;
    if (!convId) {
      const conversation = await Conversation.create({
        userId,
        title: query.length > 60 ? query.slice(0, 57) + "..." : query,
        type: "document",
        documentId: document._id,
      });
      convId = conversation._id;
    }

    await Message.create({
      conversationId: convId,
      role: "user",
      content: query,
    });

    const encoder = new TextEncoder();
    const sse = (data: string) => encoder.encode(`data: ${data}\n\n`);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation metadata immediately so client can update route
          controller.enqueue(
            sse(
              JSON.stringify({
                type: "conversation",
                data: { conversationId: convId },
              }),
            ),
          );

          let fullAnswer = "";
          let mainStreamUsageMetadata:
            | {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              totalTokenCount?: number;
              thoughtsTokenCount?: number;
            }
            | undefined;

          for await (const chunk of stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullAnswer += text;
              controller.enqueue(
                sse(JSON.stringify({ type: "text", data: text })),
              );
            }

            if (chunk.usageMetadata) {
              mainStreamUsageMetadata = chunk.usageMetadata;
            }
          }

          try {
            await Message.create({
              conversationId: convId,
              role: "model",
              content: fullAnswer || "Sorry, I couldn't generate a response.",
            });

            const itemizedCalls: CallUsageParam[] = [
              {
                callType: "document_query_embedding",
                model: models.embedding,
                promptTokens: queryEmbeddingTokens,
                outputTokens: 0,
              },
              {
                callType: "document_answer_stream",
                model: models.documentQuery,
                promptTokens: mainStreamUsageMetadata?.promptTokenCount ?? 0,
                outputTokens:
                  mainStreamUsageMetadata?.candidatesTokenCount ??
                  Math.ceil(fullAnswer.length / 4),
                thinkingTokens: mainStreamUsageMetadata?.thoughtsTokenCount,
              },
            ];

            const { creditsDeducted, newBalance, lowBalance } =
              await deductQueryCredits({
                userId,
                itemizedCalls,
                referenceId: convId?.toString(),
              });

            // Send metadata so client can update UI
            controller.enqueue(
              sse(
                JSON.stringify({
                  type: "meta",
                  data: {
                    conversationId: convId,
                    creditsUsed: creditsDeducted,
                    creditsRemaining: newBalance,
                    lowBalance,
                  },
                }),
              ),
            );
          } catch (dbError) {
            console.error("Failed to save to DB:", dbError);
          }

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
        message: "Error occurred while processing request",
      },
      { status: 500 },
    );
  }
}
