"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

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

const MIN_AMOUNT = 100;
const QUICK_AMOUNTS = [100, 250, 500, 1000];

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
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const [data, setData] = useState<CreditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Credits modal state
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [paying, setPaying] = useState(false);

  const openModal = useCallback(() => {
    setAmount("");
    setAmountError("");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showModal, closeModal]);

  const handleAmountChange = (value: string) => {
    // Allow only digits
    const cleaned = value.replace(/[^0-9]/g, "");
    setAmount(cleaned);
    if (amountError) setAmountError("");
  };

  const fetchCredits = useCallback(() => {
    axios.get("/api/credits")
      .then((res) => {
        const d = res.data;
        if (d.success) setData(d.data);
        else setError(d.message ?? "Failed to load credits");
      })
      .catch((err) => setError(err.response?.data?.message ?? "Network error"))
      .finally(() => setIsLoading(false));
  }, []);

  const razorpayHandler = async (amount: number) => {
    setPaying(true);
    try {
      const response = await axios.post("/api/credits/topup", {
        amount,
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        name: "Cognix",
        description: `Credit Topup`,
        order_id: response.data.data.orderId,
        handler: function () {
          toast.success("Payment successful!");
          fetchCredits();
        },
        prefill: {
          email: user?.email || "",
        },
        modal: {
          ondismiss: function () {
            toast.error("Payment process was cancelled.");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      closeModal();
    } catch (error: any) {
      console.error("Error while creating order", error);
      toast.error(error.response?.data?.message ?? "Something went wrong");
    } finally {
      setPaying(false);
    }
  }

  const handlePayNow = () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < MIN_AMOUNT) {
      setAmountError(`Minimum amount is ₹${MIN_AMOUNT}`);
      return;
    }
    setAmountError("");

    razorpayHandler(numAmount);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { setIsLoading(false); return; }
    fetchCredits();
  }, [isLoggedIn, authLoading]);

  const transactions = [...(data?.transactions ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const numAmount = Number(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount >= MIN_AMOUNT;

  return (
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
                <button id="add-credits-btn" className="add-credits-btn" onClick={openModal}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Credits
                </button>
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

      {/* ── Add Credits Modal ── */}
      {showModal && (
        <div className="acm-overlay" onClick={closeModal}>
          <div className="acm-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="acm-close" onClick={closeModal} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="acm-header">
              <div className="acm-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h2 className="acm-title">Add Credits</h2>
              <p className="acm-subtitle">Top up your account to keep using Cognix</p>
            </div>

            {/* Amount input */}
            <div className="acm-body">
              <label className="acm-label" htmlFor="acm-amount-input">Enter amount (₹)</label>
              <div className={`acm-input-wrap ${amountError ? "acm-input-error" : ""}`}>
                <span className="acm-currency">₹</span>
                <input
                  id="acm-amount-input"
                  type="text"
                  inputMode="numeric"
                  className="acm-input"
                  placeholder={`Min ₹${MIN_AMOUNT}`}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  autoFocus
                />
              </div>
              {amountError && <p className="acm-error-text">{amountError}</p>}

              {/* Quick amount buttons */}
              <div className="acm-quick-amounts">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    className={`acm-quick-btn ${numAmount === qa ? "acm-quick-btn-active" : ""}`}
                    onClick={() => { setAmount(String(qa)); setAmountError(""); }}
                  >
                    ₹{qa}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="acm-footer">
              <button className="acm-cancel-btn" onClick={closeModal}>Cancel</button>
              <button
                id="pay-now-btn"
                className={`acm-pay-btn ${!isValidAmount || paying ? "acm-pay-btn-disabled" : ""}`}
                onClick={handlePayNow}
                disabled={!isValidAmount || paying}
              >
                {paying ? (
                  <span className="acm-pay-spinner" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                )}
                {paying ? "Processing…" : `Pay Now ${isValidAmount ? `· ₹${numAmount}` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
