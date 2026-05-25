import ChatPage from "@/components/ChatPage";

// Dynamic route: /chat/[conversationId]
// Renders the same ChatPage shell; the sidebar's onSelectConversation
// handler will have already loaded the conversation into state.
export default function ConversationPage() {
  return <ChatPage />;
}
