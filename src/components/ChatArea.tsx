"use client";

import { useEffect, useRef, RefObject } from "react";
import { StreamingMessage, ChatMode } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface ChatAreaProps {
  messages: StreamingMessage[];
  isLoading: boolean;
  isHistoryLoading?: boolean;
  mode: ChatMode;
  onFollowUp: (q: string) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
}

const EXAMPLE_PROMPTS = [
  "Explain quantum entanglement simply",
  "What are the latest AI breakthroughs?",
  "How does retrieval-augmented generation work?",
  "Summarize the history of the internet",
];

export default function ChatArea({
  messages,
  isLoading,
  isHistoryLoading,
  mode,
  onFollowUp,
  scrollRef,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-area" ref={scrollRef}>
      {isHistoryLoading ? (
        <div className="messages-list">
          {/* Skeleton message 1: User */}
          <div className="message-row message-row-user">
            <div
              className="message-bubble message-bubble-user"
              style={{
                opacity: 0.4,
                width: "40%",
                height: "38px",
                borderRadius: "16px 16px 4px 16px",
                background: "var(--bg-subtle)",
                animation: "shimmer 1.4s infinite",
              }}
            />
          </div>
          {/* Skeleton message 2: Model */}
          <div className="message-row message-row-model">
            <div className="message-bubble message-bubble-model" style={{ width: "100%" }}>
              <div
                className="message-skeleton-line"
                style={{
                  width: "90%",
                  height: "16px",
                  background: "var(--bg-subtle)",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  animation: "shimmer 1.4s infinite",
                }}
              />
              <div
                className="message-skeleton-line"
                style={{
                  width: "75%",
                  height: "16px",
                  background: "var(--bg-subtle)",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  animation: "shimmer 1.4s infinite",
                }}
              />
              <div
                className="message-skeleton-line"
                style={{
                  width: "50%",
                  height: "16px",
                  background: "var(--bg-subtle)",
                  borderRadius: "4px",
                  animation: "shimmer 1.4s infinite",
                }}
              />
            </div>
          </div>
          {/* Skeleton message 3: User */}
          <div className="message-row message-row-user">
            <div
              className="message-bubble message-bubble-user"
              style={{
                opacity: 0.4,
                width: "25%",
                height: "38px",
                borderRadius: "16px 16px 4px 16px",
                background: "var(--bg-subtle)",
                animation: "shimmer 1.4s infinite",
              }}
            />
          </div>
          {/* Skeleton message 4: Model */}
          <div className="message-row message-row-model">
            <div className="message-bubble message-bubble-model" style={{ width: "100%" }}>
              <div
                className="message-skeleton-line"
                style={{
                  width: "80%",
                  height: "16px",
                  background: "var(--bg-subtle)",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  animation: "shimmer 1.4s infinite",
                }}
              />
              <div
                className="message-skeleton-line"
                style={{
                  width: "60%",
                  height: "16px",
                  background: "var(--bg-subtle)",
                  borderRadius: "4px",
                  animation: "shimmer 1.4s infinite",
                }}
              />
            </div>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="chat-empty">
          <div className="chat-empty-icon">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          {mode.type === "document" ? (
            <>
              <h1 className="chat-empty-title">
                Chatting with{" "}
                <span className="chat-doc-name">{mode.documentName}</span>
              </h1>
              <p className="chat-empty-sub">
                Ask anything about this document.
              </p>
            </>
          ) : (
            <>
              <h1 className="chat-empty-title">What can I help you with?</h1>
              <p className="chat-empty-sub">
                Ask me anything — I&apos;ll search the web and reason through it.
              </p>
              <div className="example-prompts">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    className="example-prompt"
                    onClick={() => onFollowUp(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="messages-list">
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={i === messages.length - 1}
              onFollowUp={onFollowUp}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="message-row message-row-model">
              <div className="message-bubble message-bubble-model">
                <div className="thinking-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
