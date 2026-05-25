import ChatPage from "@/components/ChatPage";
import { Suspense } from "react";

export default function Chat() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}
