import ChatPage from "@/components/ChatPage";
import { Suspense } from "react";

export default function ConversationPage() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}
