"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Conversation } from "@/lib/types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get("/api/conversations");
      setConversations(res.data.data ?? []);
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
      const res = await axios.get(`/api/conversations/${conversationId}`);
      return res.data.data as {
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
    } catch {
      return null;
    }
  }, []);

  return {
    conversations,
    isLoading,
    fetchConversations,
    loadConversation,
  };
}
