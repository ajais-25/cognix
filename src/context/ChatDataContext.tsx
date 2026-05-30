"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Conversation, UserDocument } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

interface ChatDataContextType {
  conversations: Conversation[];
  isLoadingConversations: boolean;
  fetchConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<{
    conversation: Conversation;
    messages: {
      _id: string;
      role: "user" | "model";
      content: string;
      sources?: unknown[];
      followUps?: string[];
      createdAt: string;
    }[];
  } | null>;

  documents: UserDocument[];
  isLoadingDocuments: boolean;
  isUploadingDocument: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  fetchDocuments: () => Promise<void>;
  uploadDocument: (
    file: File,
    onSuccess?: (doc: {
      documentId: string;
      fileName: string;
      creditsRemaining: number;
      lowBalance: boolean;
    }) => void
  ) => Promise<void>;
  clearUploadState: () => void;
}

const ChatDataContext = createContext<ChatDataContextType | undefined>(undefined);

export function ChatDataProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoadingConversations(true);
    try {
      const res = await axios.get("/api/conversations");
      setConversations(res.data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isLoggedIn]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await axios.get(`/api/conversations/${conversationId}`);
      return res.data.data;
    } catch {
      return null;
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoadingDocuments(true);
    try {
      const res = await axios.get("/api/documents");
      setDocuments(res.data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [isLoggedIn]);

  const uploadDocument = useCallback(
    async (
      file: File,
      onSuccess?: (doc: {
        documentId: string;
        fileName: string;
        creditsRemaining: number;
        lowBalance: boolean;
      }) => void
    ) => {
      setUploadError(null);
      setUploadSuccess(false);
      setIsUploadingDocument(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await axios.post("/api/documents/upload", formData);

        setUploadSuccess(true);
        await fetchDocuments();
        onSuccess?.(res.data.data);
      } catch (err: any) {
        setUploadError(err.response?.data?.message ?? "Network error while uploading.");
      } finally {
        setIsUploadingDocument(false);
      }
    },
    [fetchDocuments]
  );

  const clearUploadState = useCallback(() => {
    setUploadError(null);
    setUploadSuccess(false);
  }, []);

  // Fetch initial data when logged in
  useEffect(() => {
    if (authLoading) return;
    if (isLoggedIn) {
      fetchConversations();
      fetchDocuments();
    } else {
      setConversations([]);
      setDocuments([]);
    }
  }, [isLoggedIn, authLoading, fetchConversations, fetchDocuments]);

  return (
    <ChatDataContext.Provider
      value={{
        conversations,
        isLoadingConversations,
        fetchConversations,
        loadConversation,
        documents,
        isLoadingDocuments,
        isUploadingDocument,
        uploadError,
        uploadSuccess,
        fetchDocuments,
        uploadDocument,
        clearUploadState,
      }}
    >
      {children}
    </ChatDataContext.Provider>
  );
}

export function useChatData() {
  const context = useContext(ChatDataContext);
  if (!context) {
    throw new Error("useChatData must be used within a ChatDataProvider");
  }
  return context;
}
