"use client";

import { useState, FormEvent, useRef, KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";

function VerifyCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await axios.post(
        `/api/users/verify-code?email=${encodeURIComponent(email)}`,
        { code }
      );

      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg
            width="28"
            height="28"
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
          <span>Cognix</span>
        </div>

        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-sub">
          We sent a 6-digit code to{" "}
          <strong className="auth-email-highlight">{email}</strong>
        </p>

        {success ? (
          <div className="auth-success-msg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Account verified! Redirecting…
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="otp-row" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="otp-input"
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              id="verify-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading || digits.join("").length < 6}
            >
              {isLoading ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link href="/sign-up" className="auth-link-muted">
            ← Back to sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense>
      <VerifyCodeContent />
    </Suspense>
  );
}
