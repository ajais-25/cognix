"use client";

import { useChatData } from "@/context/ChatDataContext";

export function useConversations() {
  const { conversations, isLoadingConversations, fetchConversations, loadConversation } = useChatData();

  return {
    conversations,
    isLoading: isLoadingConversations,
    fetchConversations,
    loadConversation,
  };
}

