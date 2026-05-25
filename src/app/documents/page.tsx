"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface DocItem {
  _id: string;
  fileName: string;
  fileSize: number;
  totalChunks?: number;
  status: "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const statusLabel: Record<string, string> = {
  ready: "Ready",
  processing: "Processing",
  failed: "Failed",
};
const statusClass: Record<string, string> = {
  ready: "status-ready",
  processing: "status-processing",
  failed: "status-failed",
};

export default function DocumentsPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { conversations, isLoading: convsLoading } = useConversations();

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { setIsLoading(false); return; }
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDocuments(d.data ?? []);
        else setError(d.message ?? "Failed to load documents");
      })
      .catch(() => setError("Network error"))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, authLoading]);

  const handleSelectConversation = useCallback(
    (id: string) => { router.push(`/chat/${id}`); },
    [router],
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
          {/* Page header */}
          <div className="subpage-inner-header">
            <h1 className="subpage-title">My Documents</h1>
            <p className="subpage-sub">Your uploaded PDFs available for document chat</p>
          </div>

          {/* Content */}
          <div className="subpage-content">
            {!isLoggedIn && !authLoading ? (
              <div className="subpage-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <p>Sign in to view your documents</p>
                <Link href="/sign-in" className="subpage-signin-btn">Sign in</Link>
              </div>
            ) : isLoading ? (
              <div className="docs-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="doc-card-skeleton" />
                ))}
              </div>
            ) : error ? (
              <p className="subpage-error">{error}</p>
            ) : documents.length === 0 ? (
              <div className="subpage-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p>No documents uploaded yet</p>
                <Link href="/chat" className="subpage-signin-btn">Upload a PDF</Link>
              </div>
            ) : (
              <div className="docs-grid">
                {documents.map((doc) => (
                  <div key={doc._id} className="doc-card">
                    <div className="doc-card-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="doc-card-body">
                      <p className="doc-card-name" title={doc.fileName}>{doc.fileName}</p>
                      <div className="doc-card-meta">
                        <span>{formatBytes(doc.fileSize)}</span>
                        {doc.totalChunks != null && <span>{doc.totalChunks} chunks</span>}
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`doc-status ${statusClass[doc.status]}`}>
                      {statusLabel[doc.status]}
                    </span>
                    {doc.status === "ready" && (
                      <Link
                        href={`/chat?doc=${doc._id}`}
                        className="doc-card-chat-btn"
                        title="Chat with this document"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Chat
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
