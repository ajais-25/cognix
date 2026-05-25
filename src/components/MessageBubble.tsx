"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StreamingMessage } from "@/lib/types";
import SourceCard from "./SourceCard";
import FollowUpChips from "./FollowUpChips";

interface MessageBubbleProps {
  message: StreamingMessage;
  isLast: boolean;
  onFollowUp: (q: string) => void;
}

export default function MessageBubble({
  message,
  isLast,
  onFollowUp,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.isError;

  return (
    <div className={`message-row ${isUser ? "message-row-user" : "message-row-model"}`}>
      {!isUser && (
        <div className={`message-avatar ${isError ? "message-avatar-error" : ""}`}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      )}

      <div className={`message-bubble ${isUser ? "message-bubble-user" : isError ? "message-bubble-error" : "message-bubble-model"}`}>
        {isUser ? (
          <p className="message-user-text">{message.content}</p>
        ) : isError ? (
          <div className="error-message-container">
            <div className="error-message-header">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="error-message-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="error-message-title">Error</span>
            </div>
            <p className="error-message-text">{message.content}</p>
          </div>
        ) : (
          <>
            {/* Sources row — shown for web search results */}
            {message.sources && message.sources.length > 0 && (
              <div className="message-sources">
                {message.sources.slice(0, 6).map((s, i) => (
                  <SourceCard key={i} source={s} />
                ))}
              </div>
            )}

            {/* Markdown content */}
            <div className="message-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="streaming-cursor" aria-hidden="true" />
              )}
            </div>

            {/* Follow-up chips — only on last model message when done */}
            {isLast && !message.isStreaming && message.followUps && (
              <FollowUpChips
                followUps={message.followUps}
                onSelect={onFollowUp}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
