"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Conversation } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

interface SidebarProps {
  conversations: Conversation[];
  isLoading: boolean;
  activeConversationId: string | null;
  onSelectConversation: (
    id: string,
    type: "chat" | "document",
    documentId?: string,
  ) => void;
  onNewChat: () => void;
}

function groupByDate(convs: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const c of convs) {
    const d = new Date(c.updatedAt);
    d.setHours(0, 0, 0, 0);
    if (d >= today) groups["Today"].push(c);
    else if (d >= yesterday) groups["Yesterday"].push(c);
    else groups["Earlier"].push(c);
  }

  return groups;
}

export default function Sidebar({
  conversations,
  isLoading,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: SidebarProps) {
  const { isLoggedIn } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const grouped = groupByDate(conversations);

  const handleConversationClick = (id: string, type: "chat" | "document", documentId?: string) => {
    router.push(`/chat/${id}`);
    onSelectConversation(id, type, documentId);
  };

  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      {/* Header: toggle + new chat */}
      <div className="sidebar-header">
        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {/* Hamburger / arrow icon */}
          {collapsed ? (
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {!collapsed && (
          <button className="new-chat-btn" onClick={onNewChat}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New chat
          </button>
        )}

        {collapsed && (
          <button
            className="sidebar-toggle-btn"
            onClick={onNewChat}
            title="New chat"
            aria-label="New chat"
          >
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* Body — hidden when collapsed */}
      {!collapsed && (
        <div className="sidebar-body">
          {/* Nav links */}
          {isLoggedIn && (
            <div className="sidebar-nav-links">
              <Link
                href="/documents"
                className={`sidebar-nav-link${pathname === "/documents" ? " sidebar-nav-link-active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ display: "inline-flex", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </span>
                <span>Documents</span>
              </Link>
              <Link
                href="/credits"
                className={`sidebar-nav-link${pathname === "/credits" ? " sidebar-nav-link-active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ display: "inline-flex", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                <span>Credits</span>
              </Link>
            </div>
          )}

          {/* Conversation history */}
          <div className="sidebar-divider" />
          {!isLoggedIn ? (
            <div className="sidebar-auth-prompt">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <p>Sign in to save your chat history</p>
              <Link href="/sign-in" className="sidebar-signin-btn">
                Sign in
              </Link>
            </div>
          ) : isLoading ? (
            <div className="sidebar-skeletons">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="sidebar-skeleton" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="sidebar-empty">No past conversations yet.</p>
          ) : (
            Object.entries(grouped).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label} className="sidebar-group">
                  <span className="sidebar-group-label">{label}</span>
                  {items.map((c) => (
                    <button
                      key={c._id}
                      className={`sidebar-item ${activeConversationId === c._id ? "sidebar-item-active" : ""}`}
                      onClick={() =>
                        handleConversationClick(c._id, c.type, c.documentId)
                      }
                      title={c.title ?? "Untitled"}
                    >
                      {c.type === "document" && (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0, opacity: 0.6 }}
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                      <span className="sidebar-item-title">
                        {c.title ?? "Untitled"}
                      </span>
                    </button>
                  ))}
                </div>
              ),
            )
          )}
        </div>
      )}
    </aside>
  );
}
