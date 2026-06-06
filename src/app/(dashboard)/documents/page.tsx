"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";

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
  const { documents, isLoading } = useDocuments();

  return (
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
        ) : isLoading || authLoading ? (
          <div className="docs-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="doc-card-skeleton" />
            ))}
          </div>
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
                {/* Header */}
                <div className="doc-card-header">
                  <div className="doc-card-icon-wrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="doc-card-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <span className={`doc-status ${statusClass[doc.status]}`}>
                    <span className="status-dot" />
                    {statusLabel[doc.status]}
                  </span>
                </div>

                {/* Body */}
                <div className="doc-card-body">
                  <p className="doc-card-name" title={doc.fileName}>{doc.fileName}</p>
                  <div className="doc-card-meta">
                    <div className="meta-item" title="File Size">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                      <span>{formatBytes(doc.fileSize)}</span>
                    </div>
                    {doc.totalChunks != null && (
                      <div className="meta-item" title="Total Chunks">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="9" rx="1" />
                          <rect x="14" y="3" width="7" height="5" rx="1" />
                          <rect x="14" y="12" width="7" height="9" rx="1" />
                          <rect x="3" y="16" width="7" height="5" rx="1" />
                        </svg>
                        <span>{doc.totalChunks} chunks</span>
                      </div>
                    )}
                    <div className="meta-item" title="Upload Date">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="doc-card-footer">
                  {doc.status === "ready" ? (
                    <Link
                      href={`/chat?doc=${doc._id}`}
                      className="doc-card-chat-btn"
                      title="Chat with this document"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Chat with PDF
                    </Link>
                  ) : doc.status === "processing" ? (
                    <div className="doc-card-processing-status">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="spin">
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="doc-card-failed-status">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Failed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
