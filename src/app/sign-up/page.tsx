"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password validation rules matching signUpSchema
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Password does not meet all strength requirements.");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post("/api/users/sign-up", { name, email, password });

      // Redirect to verify-code page with email in query
      router.push(`/verify-code?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Sign up failed");
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

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-sub">
          Get started with AI-powered chat and document intelligence
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Full name
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
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

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
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
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button
            id="signup-submit-btn"
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading || !isPasswordValid}
          >
            {isLoading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/sign-in" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
