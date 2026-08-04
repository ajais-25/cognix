import { gemini } from "@/lib/gemini";
import { tavilyClient } from "@/lib/tavily";
import {
  FOLLOW_UP_PROMPT_TEMPLATE,
  FOLLOW_UP_SYSTEM_PROMPT,
  PROMPT_TEMPLATE,
  SYSTEM_PROMPT,
  WEB_SEARCH_DECISION_PROMPT,
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
import {
  CallUsageParam,
  deductQueryCredits,
  MINIMUM_REQUIRED_BALANCE,
} from "@/lib/credits";

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

    let chatHistory: { role: "user" | "model"; content: string }[] = [];
    if (conversationId) {
      const previousMessages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .select("role content")
        .lean<{ role: "user" | "model"; content: string }[]>();
      chatHistory = previousMessages;
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

    let webSearchResults: Record<string, unknown>[] = [];
    let decisionUsage: {
      promptTokens: number;
      outputTokens: number;
      thinkingTokens?: number;
    } = {
      promptTokens: 150,
      outputTokens: 30,
    };

    let needsWebSearch = true;
    try {
      const decisionPrompt = WEB_SEARCH_DECISION_PROMPT.replace(
        "{{USER_QUERY}}",
        query,
      );

      const decisionResponse = await gemini.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: decisionPrompt,
        config: { responseMimeType: "application/json" },
      });

      if (decisionResponse.usageMetadata) {
        decisionUsage = {
          promptTokens: decisionResponse.usageMetadata.promptTokenCount ?? 150,
          outputTokens:
            decisionResponse.usageMetadata.candidatesTokenCount ?? 30,
          thinkingTokens: decisionResponse.usageMetadata.thoughtsTokenCount,
        };
      }

      const decisionText = decisionResponse.text?.trim();
      if (decisionText) {
        const decision = JSON.parse(decisionText) as {
          needsWebSearch: boolean;
          reason: string;
        };
        needsWebSearch = decision.needsWebSearch;
        console.log(
          `[WebSearch] needsWebSearch=${needsWebSearch} | reason: ${decision.reason}`,
        );
      }
    } catch (err) {
      console.warn(
        "[WebSearch] Intent detection failed, defaulting to web search:",
        err,
      );
    }

    if (needsWebSearch) {
      const webSearchResponse = await tavilyClient.search(query, {
        searchDepth: "advanced",
      });
      webSearchResults = webSearchResponse.results;
    }

    const currentPrompt = needsWebSearch
      ? PROMPT_TEMPLATE.replace(
          "{{WEB_SEARCH_RESULTS}}",
          JSON.stringify(webSearchResults),
        ).replace("{{USER_QUERY}}", query)
      : `## USER_QUERY\n    ${query}`;

    const contents = [
      ...chatHistory.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: currentPrompt }] },
    ];

    const stream = await gemini.models.generateContentStream({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const encoder = new TextEncoder();
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
              model: "gemini-3.5-flash-lite",
              promptTokens: decisionUsage.promptTokens,
              outputTokens: decisionUsage.outputTokens,
              thinkingTokens: decisionUsage.thinkingTokens,
            },
            {
              callType: "main_chat_stream",
              model: "gemini-3.5-flash-lite",
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
              model: "gemini-3.5-flash-lite",
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
                model: "gemini-3.5-flash-lite",
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

          // 4. Save conversation, messages & deduct credits
          try {
            let convId = conversationId;

            if (!convId) {
              const conversation = await Conversation.create({
                userId,
                title: query.length > 60 ? query.slice(0, 57) + "..." : query,
                type: "chat",
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
                sources: webSearchResults,
                followUps,
              },
            ]);

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
