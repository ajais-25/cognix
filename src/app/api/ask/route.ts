import { gemini } from "@/lib/gemini";
import { tavilyClient } from "@/lib/tavily";
import {
  FOLLOW_UP_PROMPT_TEMPLATE,
  FOLLOW_UP_SYSTEM_PROMPT,
  PROMPT_TEMPLATE,
  SYSTEM_PROMPT,
} from "@/prompt";
import { followUpsSchema } from "@/schemas/followUpsSchema";
import { askSchema } from "@/schemas/askSchema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import User from "@/models/User";
import { deductQueryCredits, estimateQueryCost } from "@/lib/credits";

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
    }

    const webSearchResponse = await tavilyClient.search(query, {
      searchDepth: "advanced",
    });

    const webSearchResults = webSearchResponse.results;

    // Create prompt with web search results
    const prompt = PROMPT_TEMPLATE.replace(
      "{{WEB_SEARCH_RESULTS}}",
      JSON.stringify(webSearchResults),
    ).replace("{{USER_QUERY}}", query);

    // Count normal query input tokens
    const { totalTokens: normalQueryInputTokens } =
      await gemini.models.countTokens({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

    const normalQueryEstimatedCost = estimateQueryCost(
      normalQueryInputTokens ?? 0,
    );

    if (user.credits < normalQueryEstimatedCost) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insufficient credits to complete this query. Please top up.",
          data: {
            creditsRemaining: user.credits,
            estimatedCost: normalQueryEstimatedCost, // tells the UI exactly how many credits are needed
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
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const encoder = new TextEncoder();

    // Helper to send an SSE event
    const sse = (data: string) => encoder.encode(`data: ${data}\n\n`);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 1. Send web search results first
          controller.enqueue(
            sse(
              JSON.stringify({ type: "searchResults", data: webSearchResults }),
            ),
          );

          // 2. Stream answer chunks as plain text
          let fullAnswer = "";
          let normalQueryUsageMetadata:
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
              normalQueryUsageMetadata = chunk.usageMetadata;
            }
          }

          // 3. Generate follow-ups via a fast non-streaming call with JSON schema
          const followUpPrompt = FOLLOW_UP_PROMPT_TEMPLATE.replace(
            "{{USER_QUERY}}",
            query,
          ).replace("{{ANSWER}}", fullAnswer);

          // Count follow-up input tokens
          const { totalTokens: followUpInputTokens } =
            await gemini.models.countTokens({
              model: "gemini-3-flash-preview",
              contents: followUpPrompt,
            });

          const followUpEstimatedCost = estimateQueryCost(
            followUpInputTokens ?? 0,
          );

          if (user.credits - normalQueryEstimatedCost < followUpEstimatedCost) {
            controller.enqueue(
              sse(
                JSON.stringify({
                  type: "error",
                  data: "Insufficient credits to generate follow-up questions.",
                }),
              ),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          const followUpResponse = await gemini.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: followUpPrompt,
            config: {
              systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
              responseMimeType: "application/json",
              responseJsonSchema: z.toJSONSchema(followUpsSchema),
            },
          });

          const followUpText = followUpResponse.text;
          let followUps: string[] = [];
          let followUpUsageMetadata:
            | {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              totalTokenCount?: number;
            }
            | undefined;

          if (followUpResponse.usageMetadata) {
            followUpUsageMetadata = followUpResponse.usageMetadata;
          }

          if (followUpText) {
            const parsed = JSON.parse(followUpText);
            followUps = parsed.followUps ?? [];
            controller.enqueue(
              sse(JSON.stringify({ type: "followUps", data: followUps })),
            );
          }

          // 4. Save conversation and messages to DB
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
                content: query,
              },
              {
                conversationId: convId,
                role: "assistant",
                content: fullAnswer,
                sources: webSearchResults,
                followUps,
              },
            ]);

            const usageMetadata = {
              promptTokenCount:
                (normalQueryUsageMetadata?.promptTokenCount ?? 0) +
                (followUpUsageMetadata?.promptTokenCount ?? 0),
              candidatesTokenCount:
                (normalQueryUsageMetadata?.candidatesTokenCount ?? 0) +
                (followUpUsageMetadata?.candidatesTokenCount ?? 0),
              totalTokenCount:
                (normalQueryUsageMetadata?.totalTokenCount ?? 0) +
                (followUpUsageMetadata?.totalTokenCount ?? 0),
            };

            const { creditsDeducted, newBalance, lowBalance } =
              await deductQueryCredits({
                userId,
                balance: user.credits,
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
                    creditsUsed: creditsDeducted,
                    creditsRemaining: newBalance,
                    lowBalance, // frontend shows warning banner when true
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
        message: "Error occured while chating",
      },
      {
        status: 500,
      },
    );
  }
}
