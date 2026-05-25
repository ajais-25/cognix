"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password validation rules matching resetPasswordSchema
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Please request a new link.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet all strength requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(`/api/users/reset-password?token=${encodeURIComponent(token)}`, {
        newPassword: password,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
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
          <h1 className="auth-title">Invalid Link</h1>
          <p className="auth-sub" style={{ color: "var(--red)" }}>
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <p className="auth-footer" style={{ marginTop: "16px" }}>
            <Link href="/forgot-password" className="auth-link">
              Request reset link
            </Link>
          </p>
        </div>
      </div>
    );
  }

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

        <h1 className="auth-title">Reset password</h1>
        <p className="auth-sub">Enter your new secure password below</p>

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
            Password reset successful! Redirecting…
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                New password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
              />
            </div>

            {password && (
              <div
                className="password-criteria"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--bg-base)",
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password Strength:</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasMinLength ? "var(--green)" : "var(--text-tertiary)" }}>
                  <span style={{ transition: "all 0.15s" }}>{hasMinLength ? "✓" : "○"}</span> At least 6 characters
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasUppercase ? "var(--green)" : "var(--text-tertiary)" }}>
                  <span style={{ transition: "all 0.15s" }}>{hasUppercase ? "✓" : "○"}</span> At least one uppercase letter
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasLowercase ? "var(--green)" : "var(--text-tertiary)" }}>
                  <span style={{ transition: "all 0.15s" }}>{hasLowercase ? "✓" : "○"}</span> At least one lowercase letter
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasNumber ? "var(--green)" : "var(--text-tertiary)" }}>
                  <span style={{ transition: "all 0.15s" }}>{hasNumber ? "✓" : "○"}</span> At least one number
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: hasSpecial ? "var(--green)" : "var(--text-tertiary)" }}>
                  <span style={{ transition: "all 0.15s" }}>{hasSpecial ? "✓" : "○"}</span> At least one special character
                </div>
                {confirmPassword && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "4px",
                      paddingTop: "4px",
                      borderTop: "1px solid var(--border)",
                      color: passwordsMatch ? "var(--green)" : "var(--red)",
                    }}
                  >
                    <span>{passwordsMatch ? "✓" : "✗"}</span> {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </div>
                )}
              </div>
            )}

            {error && <p className="auth-error">{error}</p>}

            <button
              id="reset-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
            >
              {isLoading ? "Resetting password…" : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card" style={{ alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
          <div className="spin" style={{ width: "32px", height: "32px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}></div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
