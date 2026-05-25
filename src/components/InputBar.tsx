"use client";

import {
  useRef,
  useState,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
} from "react";

interface InputBarProps {
  onSend: (query: string) => void;
  isLoading: boolean;
  isPdfPanelOpen: boolean;
  onTogglePdf: () => void;
  initialValue?: string;
  placeholder?: string;
}

export default function InputBar({
  onSend,
  isLoading,
  isPdfPanelOpen,
  onTogglePdf,
  initialValue = "",
  placeholder = "Ask anything…",
}: InputBarProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When a follow-up chip is clicked, parent updates initialValue
  useEffect(() => {
    setValue(initialValue);
    textareaRef.current?.focus();
  }, [initialValue]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    autoResize();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="input-bar-wrapper">
      <div className={`input-bar ${isLoading ? "input-bar-loading" : ""}`}>
        <button
          id="pdf-toggle-btn"
          className={`input-icon-btn ${isPdfPanelOpen ? "input-icon-btn-active" : ""}`}
          onClick={onTogglePdf}
          title="Upload / manage PDFs"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          id="chat-input"
          ref={textareaRef}
          className="input-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
        />

        <button
          id="send-btn"
          className={`send-btn ${value.trim() && !isLoading ? "send-btn-active" : ""}`}
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          type="button"
          title="Send (Enter)"
        >
          {isLoading ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <p className="input-hint">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
