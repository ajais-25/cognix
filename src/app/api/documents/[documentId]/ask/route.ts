import { getDataFromToken } from "@/helpers/getDataFromToken";
import {
  CallUsageParam,
  deductQueryCredits,
  MINIMUM_REQUIRED_BALANCE,
} from "@/lib/credits";
import dbConnect from "@/lib/dbConnect";
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

    const freshUser = await User.findById(userId).select("credits").lean();
    const currentCredits =
      (freshUser as { credits?: number } | null)?.credits ?? user.credits;

    if (currentCredits < MINIMUM_REQUIRED_BALANCE) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient credits to complete this query. Please top up.",
          data: {
            creditsRemaining: parseFloat(currentCredits.toFixed(4)),
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

    // Stream the answer using gemini-3.5-flash-lite
    const { queryEmbeddingTokens, stream } = await streamAnswer(
      query,
      userId,
      documentId,
    );

    const encoder = new TextEncoder();
    const sse = (data: string) => encoder.encode(`data: ${data}\n\n`);

    const readable = new ReadableStream({
      async start(controller) {
        try {
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

          let convId = conversationId;
          try {
            if (!convId) {
              const conversation = await Conversation.create({
                userId,
                title: query.length > 60 ? query.slice(0, 57) + "..." : query,
                type: "document",
                documentId: document._id,
              });
              convId = conversation._id;
            }

            await Message.insertMany([
              {
                conversationId: convId,
                role: "user",
                content: query,
              },
              {
                conversationId: convId,
                role: "model",
                content: fullAnswer,
              },
            ]);

            const itemizedCalls: CallUsageParam[] = [
              {
                callType: "document_query_embedding",
                model: "gemini-embedding-2",
                promptTokens: queryEmbeddingTokens,
                outputTokens: 0,
              },
              {
                callType: "document_answer_stream",
                model: "gemini-3.5-flash-lite",
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
                balance: currentCredits,
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
