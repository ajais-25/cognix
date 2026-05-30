"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { StreamingMessage } from "@/lib/types";
import SourceCard from "./SourceCard";
import FollowUpChips from "./FollowUpChips";

/* ── Copy button with feedback ─────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      className={`code-copy-btn ${copied ? "code-copy-btn-copied" : ""}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

/* ── Custom renderers for ReactMarkdown ────────────────────────── */
const markdownComponents = {
  code({ className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { className?: string }) {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    // Fenced code block (has a language class OR is inside a <pre>)
    if (match) {
      return (
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span className="code-block-lang">{match[1]}</span>
            <CopyButton text={codeString} />
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: "0 0 8px 8px",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    // Inline code
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // Override <pre> so that fenced blocks without a language still get the copy button
  pre({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) {
    // If children is already a code-block-wrapper (language was detected), pass through
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const child = children as React.ReactElement<any>;
    if (child?.props?.className && /language-/.test(child.props.className)) {
      return <>{children}</>;
    }

    // No-language fenced block: wrap in copy-enabled container
    const codeString =
      typeof child?.props?.children === "string"
        ? child.props.children.replace(/\n$/, "")
        : "";

    return (
      <div className="code-block-wrapper">
        <div className="code-block-header">
          <span className="code-block-lang">text</span>
          <CopyButton text={codeString} />
        </div>
        <pre {...props} className="code-block-pre">
          {children}
        </pre>
      </div>
    );
  },
};

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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
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

