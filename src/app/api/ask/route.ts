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

export async function POST(request: NextRequest) {
  try {
    const { query, conversationId } = await request.json();

    // TODO: Replace with actual userId from auth middleware, Dummy for now
    const userId = "683e0a4b8f1c2d3e4f5a6b7c";

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

    const webSearchResponse = await tavilyClient.search(query, {
      searchDepth: "advanced",
    });

    const webSearchResults = webSearchResponse.results;

    // Create prompt with web search results
    const prompt = PROMPT_TEMPLATE.replace(
      "{{WEB_SEARCH_RESULTS}}",
      JSON.stringify(webSearchResults),
    ).replace("{{USER_QUERY}}", query);

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

          for await (const chunk of stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullAnswer += text;
              controller.enqueue(
                sse(JSON.stringify({ type: "text", data: text })),
              );
            }
          }

          // 3. Generate follow-ups via a fast non-streaming call with JSON schema
          const followUpPrompt = FOLLOW_UP_PROMPT_TEMPLATE.replace(
            "{{USER_QUERY}}",
            query,
          ).replace("{{ANSWER}}", fullAnswer);

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

          if (followUpText) {
            const parsed = JSON.parse(followUpText);
            followUps = parsed.followUps ?? [];
            controller.enqueue(
              sse(JSON.stringify({ type: "followUps", data: followUps })),
            );
          }

          // 4. Save conversation and messages to DB
          try {
            await dbConnect();

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
    console.log("Error", error);
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
