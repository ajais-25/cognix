import ChatPage from "@/components/ChatPage";
import { Suspense } from "react";

// Optional catch-all route: /chat/[[...conversationId]]
// Renders the same ChatPage shell; the sidebar's onSelectConversation
// handler will have already loaded the conversation into state, or the
// ChatPage will load it on mount/update based on the path parameters.
export default function ConversationPage() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}
