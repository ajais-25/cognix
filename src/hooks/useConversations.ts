"use client";

import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/lib/types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        return data.data as {
          conversation: Conversation;
          messages: {
            _id: string;
            role: "user" | "model";
            content: string;
            sources?: unknown[];
            followUps?: string[];
            createdAt: string;
          }[];
        };
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  return {
    conversations,
    isLoading,
    fetchConversations,
    loadConversation,
  };
}
