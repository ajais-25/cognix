import ChatPage from "@/components/ChatPage";
import { Suspense } from "react";

export default function NewChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}
