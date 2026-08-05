import {
  PROMPT_TEMPLATE,
  SYSTEM_PROMPT,
  WEB_SEARCH_DECISION_PROMPT,
} from "@/prompt";
import { ChatHistory } from "./types";
import { gemini } from "./gemini";
import { models } from "./models";
import { tavilyClient } from "./tavily";

export async function streamQueryResponse(
  query: string,
  chatHistory: ChatHistory[],
) {
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
      model: models.webSearchDecision,
      contents: decisionPrompt,
      config: { responseMimeType: "application/json" },
    });

    if (decisionResponse.usageMetadata) {
      decisionUsage = {
        promptTokens: decisionResponse.usageMetadata.promptTokenCount ?? 150,
        outputTokens: decisionResponse.usageMetadata.candidatesTokenCount ?? 30,
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

  const prompt = needsWebSearch
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
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  let stream;
  try {
    stream = await gemini.models.generateContentStream({
      model: models.normalQuery,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
  } catch (err) {
    console.error("[AnswerQuery] Failed to generate stream:", err);
    throw err;
  }

  return { decisionUsage, webSearchResults, stream };
}
