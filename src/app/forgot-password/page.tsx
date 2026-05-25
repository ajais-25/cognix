"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import axios from "axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      await axios.post("/api/users/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Something went wrong. Please try again.");
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

        <h1 className="auth-title">Forgot password?</h1>
        <p className="auth-sub">
          Enter your email and we&apos;ll send you a link to reset your password
        </p>

        {success ? (
          <div className="auth-success-msg" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              <strong>Reset link sent!</strong>
            </div>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>
              If an account is associated with this email, you will receive a reset link shortly.
            </span>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              id="forgot-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? "Sending link…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="auth-footer" style={{ marginTop: "16px" }}>
          <Link href="/sign-in" className="auth-link-muted">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
