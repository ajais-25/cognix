import { getDataFromToken } from "@/helpers/getDataFromToken";
import { deductQueryCredits, estimateQueryCost } from "@/lib/credits";
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
            message:
              "This conversation belongs to a different document.",
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

    // Count input tokens
    const { totalTokens: inputTokens } = await gemini.models.countTokens({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const estimatedCost = estimateQueryCost(inputTokens ?? 0);

    // Re-fetch credits atomically to guard against concurrent requests that may have depleted the balance between the initial user fetch and this point.
    const freshUser = await User.findById(userId).select("credits").lean();
    const currentCredits =
      (freshUser as { credits?: number } | null)?.credits ?? user.credits;

    if (currentCredits < estimatedCost) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient credits to complete this query. Please top up.",
          data: {
            creditsRemaining: currentCredits,
            estimatedCost: estimatedCost, // tells the UI exactly how many credits are needed
          },
        },
        { status: 402 },
      );
    }

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
          let usageMetadata:
            | {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              totalTokenCount?: number;
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
              usageMetadata = chunk.usageMetadata;
            }
          }

          if (!usageMetadata) {
            console.warn(
              "[document/ask] usageMetadata missing from Gemini stream — 0 credits will be deducted",
            );
          }

          // 2. Save conversation and messages to DB
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
                role: "assistant",
                content: fullAnswer,
              },
            ]);
          } catch (dbError) {
            console.error("Failed to save messages to DB:", dbError);
          }

          // 3. Deduct credits - kept in a separate try/catch so any failure is reported to the client via SSE rather than silently dropped
          try {
            const { creditsDeducted, newBalance, lowBalance } =
              await deductQueryCredits({
                userId,
                balance: currentCredits,
                tokenMeta: {
                  promptTokens: usageMetadata?.promptTokenCount ?? 0,
                  outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
                  totalTokens: usageMetadata?.totalTokenCount ?? 0,
                },
                referenceId: convId?.toString(),
              });

            // Send metadata so the client can continue this chat
            controller.enqueue(
              sse(
                JSON.stringify({
                  type: "meta",
                  data: {
                    conversationId: convId,
                    documentId: document._id,
                    creditsUsed: creditsDeducted,
                    creditsRemaining: newBalance,
                    lowBalance, // frontend shows warning banner when true
                  },
                }),
              ),
            );
          } catch (deductError) {
            console.error("Failed to deduct credits:", deductError);
            controller.enqueue(
              sse(
                JSON.stringify({
                  type: "error",
                  data: {
                    message:
                      "Answer generated but credit deduction failed. Please contact support.",
                  },
                }),
              ),
            );
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
