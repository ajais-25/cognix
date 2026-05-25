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

  return (
    <div className={`message-row ${isUser ? "message-row-user" : "message-row-model"}`}>
      {!isUser && (
        <div className="message-avatar">
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

      <div className={`message-bubble ${isUser ? "message-bubble-user" : "message-bubble-model"}`}>
        {isUser ? (
          <p className="message-user-text">{message.content}</p>
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
