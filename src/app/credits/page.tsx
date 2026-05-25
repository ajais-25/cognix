"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface TokenMeta { promptTokens: number; outputTokens: number; totalTokens: number; }
interface UploadMeta { totalChunks: number; creditsPerChunk: number; }
interface CreditTransaction {
  _id: string;
  amount: number;
  type: "topup" | "deduction" | "refund" | "bonus";
  balanceAfter: number;
  tokenMeta?: TokenMeta;
  uploadMeta?: UploadMeta;
  referenceId?: string;
  createdAt: string;
}
interface CreditsData { credits: number; lowBalance: boolean; transactions: CreditTransaction[]; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const typeLabel: Record<string, string> = { topup: "Top-up", deduction: "Deduction", refund: "Refund", bonus: "Bonus" };
const typeClass: Record<string, string> = { topup: "txn-topup", refund: "txn-topup", bonus: "txn-topup", deduction: "txn-deduction" };

function TxnDescription({ txn }: { txn: CreditTransaction }) {
  if (txn.type === "deduction" && txn.uploadMeta)
    return <span className="txn-desc">PDF upload · {txn.uploadMeta.totalChunks} chunks × {txn.uploadMeta.creditsPerChunk} cr</span>;
  if (txn.type === "deduction" && txn.tokenMeta)
    return <span className="txn-desc">Query · {txn.tokenMeta.totalTokens.toLocaleString()} tokens <span className="txn-token-detail">({txn.tokenMeta.promptTokens.toLocaleString()} in / {txn.tokenMeta.outputTokens.toLocaleString()} out)</span></span>;
  if (txn.type === "topup") return <span className="txn-desc">Credit top-up</span>;
  if (txn.type === "bonus") return <span className="txn-desc">Bonus credits</span>;
  if (txn.type === "refund") return <span className="txn-desc">Refund</span>;
  return <span className="txn-desc">—</span>;
}

export default function CreditsPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { conversations, isLoading: convsLoading } = useConversations();
  const [data, setData] = useState<CreditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { setIsLoading(false); return; }
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); else setError(d.message ?? "Failed to load credits"); })
      .catch(() => setError("Network error"))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, authLoading]);

  const handleSelectConversation = useCallback(
    (id: string) => { router.push(`/chat/${id}`); },
    [router],
  );

  const transactions = [...(data?.transactions ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="app-shell">
      <Navbar />

      <div className="main-layout">
        <Sidebar
          conversations={conversations}
          isLoading={convsLoading}
          activeConversationId={null}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => router.push("/chat")}
        />

        <main className="subpage-main">
          <div className="subpage-inner-header">
            <h1 className="subpage-title">Credits</h1>
            <p className="subpage-sub">Your credit balance and transaction history</p>
          </div>

          <div className="subpage-content">
            {!isLoggedIn && !authLoading ? (
              <div className="subpage-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <p>Sign in to view your credits</p>
                <Link href="/sign-in" className="subpage-signin-btn">Sign in</Link>
              </div>
            ) : isLoading ? (
              <div className="credits-loading">
                <div className="credit-balance-skeleton" />
                <div className="txn-skeleton-list">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="txn-skeleton" />)}
                </div>
              </div>
            ) : error ? (
              <p className="subpage-error">{error}</p>
            ) : (
              <>
                {/* Balance card */}
                <div className={`credit-balance-card ${data?.lowBalance ? "credit-low" : ""}`}>
                  <div className="credit-balance-left">
                    <span className="credit-balance-label">Current Balance</span>
                    <span className="credit-balance-amount">{data?.credits ?? 0}</span>
                    <span className="credit-balance-unit">credits</span>
                  </div>
                  <div className="credit-balance-right">
                    {data?.lowBalance && <span className="credit-low-badge">⚠ Low balance</span>}
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="credit-balance-icon">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                </div>

                {/* Transactions */}
                <div className="txn-section">
                  <h2 className="txn-section-title">Transaction History</h2>
                  {transactions.length === 0 ? (
                    <p className="subpage-empty-inline">No transactions yet.</p>
                  ) : (
                    <div className="txn-list">
                      {transactions.map((txn) => (
                        <div key={txn._id} className="txn-row">
                          <div className="txn-left">
                            <span className={`txn-type-badge ${typeClass[txn.type]}`}>{typeLabel[txn.type]}</span>
                            <div className="txn-info">
                              <TxnDescription txn={txn} />
                              <span className="txn-date">{formatDate(txn.createdAt)}</span>
                            </div>
                          </div>
                          <div className="txn-right">
                            <span className={`txn-amount ${typeClass[txn.type]}`}>
                              {txn.type === "deduction" ? "−" : "+"}{Math.abs(txn.amount)}
                            </span>
                            <span className="txn-balance-after">Bal: {txn.balanceAfter}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
