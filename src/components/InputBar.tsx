"use client";

import { useRef, useState, useEffect, KeyboardEvent, ChangeEvent } from "react";

interface InputBarProps {
  onSend: (query: string) => void;
  isLoading: boolean;
  onUpload?: (file: File) => void;
  initialValue?: string;
  placeholder?: string;
  isDocMode?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export default function InputBar({
  onSend,
  isLoading,
  onUpload,
  initialValue = "",
  placeholder = "Ask anything…",
  isDocMode = false,
  disabled = false,
  disabledReason,
}: InputBarProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== "application/pdf") {
      alert("Only PDF files are supported.");
      return;
    }
    if (file.size > 20_000_000) {
      alert("File must be ≤ 20 MB.");
      return;
    }
    onUpload?.(file);
  };

  useEffect(() => {
    setValue(initialValue);

    const el = textareaRef.current;
    if (el) {
      el.value = initialValue;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
      if (!disabled) {
        el.focus();
      }
    }
  }, [initialValue, disabled]);

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
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="input-bar-wrapper">
      <div
        className={`input-bar ${isLoading ? "input-bar-loading" : ""} ${isDocMode ? "input-bar-doc-mode" : ""} ${disabled ? "input-bar-disabled" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="ui-tooltip">
          <button
            id="pdf-upload-btn"
            className="input-icon-btn"
            onClick={() =>
              !isDocMode && !isLoading && !disabled && fileInputRef.current?.click()
            }
            type="button"
            disabled={isDocMode || isLoading || disabled}
            aria-label={
              disabled
                ? disabledReason ?? "Upload Disabled"
                : isDocMode
                  ? "Upload Disabled"
                  : isLoading
                    ? "Upload disabled while generating"
                    : "Upload PDF"
            }
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
          <span className="ui-tooltip-text">
            {disabled
              ? disabledReason ?? "Disabled"
              : isDocMode
                ? "Upload Disabled"
                : isLoading
                  ? "Wait for response"
                  : "Upload PDF"}
          </span>
        </div>

        <textarea
          id="chat-input"
          ref={textareaRef}
          className="input-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading || disabled}
        />

        <button
          id="send-btn"
          className={`send-btn ${value.trim() && !isLoading && !disabled ? "send-btn-active" : ""}`}
          onClick={handleSend}
          disabled={!value.trim() || isLoading || disabled}
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
