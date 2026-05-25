"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChatMode, StreamingMessage, SearchResult } from "@/lib/types";
import { useChat } from "@/hooks/useChat";
import { useDocuments } from "@/hooks/useDocuments";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/context/AuthContext";
import { UserDocument } from "@/lib/types";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import InputBar from "@/components/InputBar";

export default function ChatPage() {
  const { isLoggedIn, setCredits } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams?.get("doc");
  const urlConversationId = params?.conversationId as string | undefined;

  const [mode, setMode] = useState<ChatMode>({ type: "chat" });
  const [followUpInput, setFollowUpInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    setConversationId,
    setMessages,
  } = useChat(mode);

  const { conversations, fetchConversations, loadConversation } =
    useConversations();

  const {
    documents,
    isLoading: docsLoading,
    isUploading,
    uploadError,
    uploadSuccess,
    uploadDocument,
    clearUploadState,
  } = useDocuments();

  const handleNewChat = useCallback(() => {
    router.push("/chat");
    resetChat();
    setMode({ type: "chat" });
    setActiveConversationId(null);
    clearUploadState();
  }, [router, resetChat, clearUploadState]);

  const handleSelectConversation = useCallback(
    async (id: string, type?: "chat" | "document", documentId?: string) => {
      const data = await loadConversation(id);
      if (!data) return;

      setActiveConversationId(id);
      setConversationId(id);

      const loaded: StreamingMessage[] = data.messages.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        sources: (m.sources as SearchResult[]) ?? [],
        followUps: m.followUps ?? [],
        isStreaming: false,
      }));
      setMessages(loaded);

      const resolvedType = type ?? data.conversation.type;
      const resolvedDocId = documentId ?? data.conversation.documentId;

      if (resolvedType === "document" && resolvedDocId) {
        const doc = documents.find((d) => d._id === resolvedDocId);
        setMode({
          type: "document",
          documentId: resolvedDocId,
          documentName: doc?.fileName ?? "Document",
        });
      } else {
        setMode({ type: "chat" });
      }
    },
    [loadConversation, setConversationId, setMessages, documents],
  );

  useEffect(() => {
    if (urlConversationId) {
      if (urlConversationId !== activeConversationId) {
        handleSelectConversation(urlConversationId);
      }
    } else if (activeConversationId !== null) {
      resetChat();
      setMode({ type: "chat" });
      setActiveConversationId(null);
      clearUploadState();
    }
  }, [
    urlConversationId,
    activeConversationId,
    handleSelectConversation,
    resetChat,
    clearUploadState,
  ]);

  const handleSend = useCallback(
    async (query: string) => {
      setFollowUpInput("");
      await sendMessage(query);
      if (isLoggedIn) fetchConversations();
    },
    [sendMessage, isLoggedIn, fetchConversations],
  );

  const handleUpload = useCallback(
    (file: File) => {
      uploadDocument(file, (result) => {
        setCredits(result.creditsRemaining, result.lowBalance);
        setMode({
          type: "document",
          documentId: result.documentId,
          documentName: result.fileName,
        });
        resetChat();
        setActiveConversationId(null);
      });
    },
    [uploadDocument, setCredits, resetChat],
  );

  useEffect(() => {
    if (docId && documents.length > 0) {
      const doc = documents.find((d) => d._id === docId);
      if (doc && doc.status === "ready") {
        setMode({
          type: "document",
          documentId: doc._id,
          documentName: doc.fileName,
        });
        resetChat();
        setActiveConversationId(null);
      }
    }
  }, [docId, documents, resetChat]);

  const handleSelectDocument = useCallback((doc: UserDocument) => {
    setMode({
      type: "document",
      documentId: doc._id,
      documentName: doc.fileName,
    });
    resetChat();
    setActiveConversationId(null);
  }, [resetChat]);

  const handleFollowUp = useCallback((q: string) => {
    setFollowUpInput(q);
  }, []);

  const docModePlaceholder =
    mode.type === "document"
      ? `Ask about ${mode.documentName}…`
      : "Ask anything…";

  return (
    <div className="app-shell">
      <Navbar onNewChat={handleNewChat} />

      <div className="main-layout">
        <Sidebar
          conversations={conversations}
          isLoading={false}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />

        <main className="chat-main">
          {isUploading && (
            <div className="upload-status-banner">
              <svg
                className="spin"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Uploading and processing document…</span>
            </div>
          )}

          {uploadError && (
            <div className="upload-status-banner upload-status-error">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{uploadError}</span>
              <button
                className="clear-upload-error-btn"
                onClick={clearUploadState}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          <ChatArea
            messages={messages}
            isLoading={isLoading}
            mode={mode}
            onFollowUp={handleFollowUp}
          />

          <div className="input-section">
            {mode.type === "document" && (
              <div className="doc-mode-banner">
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Chatting with <strong>{mode.documentName}</strong>
                <button
                  className="exit-doc-btn"
                  onClick={() => {
                    setMode({ type: "chat" });
                    resetChat();
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            <InputBar
              onSend={handleSend}
              isLoading={isLoading}
              onUpload={handleUpload}
              initialValue={followUpInput}
              placeholder={docModePlaceholder}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
