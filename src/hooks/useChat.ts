"use client";

import { useState, useCallback, useRef } from "react";
import { StreamingMessage, ChatMode, SearchResult } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}`;

export function useChat(mode: ChatMode) {
  const { setCredits } = useAuth();
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isLoading) return;

      abortRef.current = new AbortController();

      // Optimistically add user bubble
      const userMsg: StreamingMessage = {
        id: newId(),
        role: "user",
        content: query,
      };

      const modelMsgId = newId();
      const modelMsg: StreamingMessage = {
        id: modelMsgId,
        role: "model",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, modelMsg]);
      setIsLoading(true);

      try {
        const url =
          mode.type === "document"
            ? `/api/documents/${mode.documentId}/ask`
            : "/api/ask";

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, conversationId }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          const errMsg =
            data.message ?? "Something went wrong. Please try again.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId
                ? { ...m, content: errMsg, isStreaming: false }
                : m,
            ),
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;

            try {
              const event = JSON.parse(payload) as {
                type: string;
                data: unknown;
              };

              switch (event.type) {
                case "text":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId
                        ? { ...m, content: m.content + (event.data as string) }
                        : m,
                    ),
                  );
                  break;

                case "searchResults":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId
                        ? { ...m, sources: event.data as SearchResult[] }
                        : m,
                    ),
                  );
                  break;

                case "followUps":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId
                        ? { ...m, followUps: event.data as string[] }
                        : m,
                    ),
                  );
                  break;

                case "meta": {
                  const meta = event.data as {
                    conversationId: string;
                    creditsRemaining: number;
                    lowBalance: boolean;
                  };
                  setConversationId(meta.conversationId);
                  setCredits(meta.creditsRemaining, meta.lowBalance);
                  break;
                }

                case "error":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === modelMsgId
                        ? {
                            ...m,
                            content:
                              m.content ||
                              ((event.data as { message?: string })?.message ??
                                "An error occurred."),
                          }
                        : m,
                    ),
                  );
                  break;
              }
            } catch {
              // Malformed JSON line — skip
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  content: "Connection error. Please try again.",
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsLoading(false);
      }
    },
    [mode, conversationId, isLoading, setCredits],
  );

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    resetChat,
    setConversationId,
    setMessages,
  };
}
