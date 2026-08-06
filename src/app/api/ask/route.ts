import { gemini } from "@/lib/gemini";
import { models } from "@/lib/models";
import { FOLLOW_UP_PROMPT_TEMPLATE, FOLLOW_UP_SYSTEM_PROMPT } from "@/prompt";
import { followUpsSchema } from "@/schemas/followUpsSchema";
import { askSchema } from "@/schemas/askSchema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import User from "@/models/User";
import {
  CallUsageParam,
  deductQueryCredits,
  MINIMUM_REQUIRED_BALANCE,
} from "@/lib/credits";
import { ChatHistory } from "@/lib/types";
import { streamQueryResponse } from "@/lib/answerQuery";

export async function POST(request: NextRequest) {
  try {
    const { query, conversationId } = await request.json();

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

    const result = askSchema.safeParse({ query, conversationId });

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

      if (isUserCoversation.type !== "chat") {
        return NextResponse.json(
          {
            success: false,
            message:
              "This conversation is a document conversation. Use the document ask route instead.",
          },
          { status: 400 },
        );
      }
    }

    let chatHistory: ChatHistory[] = [];
    if (conversationId) {
      const previousMessages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .select("role content")
        .lean<ChatHistory[]>();
      chatHistory = previousMessages;
    }

    const { decisionUsage, webSearchResults, stream } =
      await streamQueryResponse(query, chatHistory);

    // Create conversation and save user message BEFORE streaming
    // so the user message gets an earlier createdAt timestamp
    let convId = conversationId;
    if (!convId) {
      const conversation = await Conversation.create({
        userId,
        title: query.length > 60 ? query.slice(0, 57) + "..." : query,
        type: "chat",
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

          // 1. Send web search results first
          controller.enqueue(
            sse(
              JSON.stringify({ type: "searchResults", data: webSearchResults }),
            ),
          );

          // 2. Stream answer chunks as plain text
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

          const itemizedCalls: CallUsageParam[] = [
            {
              callType: "web_search_decision",
              model: models.webSearchDecision,
              promptTokens: decisionUsage.promptTokens,
              outputTokens: decisionUsage.outputTokens,
              thinkingTokens: decisionUsage.thinkingTokens,
            },
            {
              callType: "main_chat_stream",
              model: models.normalQuery,
              promptTokens: mainStreamUsageMetadata?.promptTokenCount ?? 0,
              outputTokens:
                mainStreamUsageMetadata?.candidatesTokenCount ??
                Math.ceil(fullAnswer.length / 4),
              thinkingTokens: mainStreamUsageMetadata?.thoughtsTokenCount,
            },
          ];

          // 3. Optional Follow-up generation
          const followUpPrompt = FOLLOW_UP_PROMPT_TEMPLATE.replace(
            "{{USER_QUERY}}",
            query,
          ).replace("{{ANSWER}}", fullAnswer);

          let followUps: string[] = [];
          try {
            const followUpResponse = await gemini.models.generateContent({
              model: models.followUpGeneration,
              contents: followUpPrompt,
              config: {
                systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseJsonSchema: z.toJSONSchema(followUpsSchema),
              },
            });

            if (followUpResponse.usageMetadata) {
              itemizedCalls.push({
                callType: "follow_up_generation",
                model: models.followUpGeneration,
                promptTokens:
                  followUpResponse.usageMetadata.promptTokenCount ?? 300,
                outputTokens:
                  followUpResponse.usageMetadata.candidatesTokenCount ?? 100,
                thinkingTokens:
                  followUpResponse.usageMetadata.thoughtsTokenCount,
              });
            }

            const followUpText = followUpResponse.text;
            if (followUpText) {
              const parsed = JSON.parse(followUpText);
              followUps = parsed.followUps ?? [];
              controller.enqueue(
                sse(JSON.stringify({ type: "followUps", data: followUps })),
              );
            }
          } catch (followUpErr) {
            console.warn(
              "[ask] Follow-up generation skipped or failed:",
              followUpErr,
            );
          }

          // 4. Save model message & deduct credits
          try {
            await dbConnect();
            await Message.create({
              conversationId: convId,
              role: "model",
              content: fullAnswer || "Sorry, I couldn't generate a response.",
              sources: webSearchResults,
              followUps,
            });

            const { creditsDeducted, newBalance, lowBalance } =
              await deductQueryCredits({
                userId,
                itemizedCalls,
                referenceId: convId?.toString(),
              });

            // Send metadata so the client can update UI
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

          // 5. Signal stream end
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
    console.log("Error in /api/ask:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error occurred while processing request",
      },
      {
        status: 500,
      },
    );
  }
}
