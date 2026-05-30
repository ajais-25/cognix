"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useConversations } from "@/hooks/useConversations";
import { useSidebar } from "@/context/SidebarContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { mobileOpen, closeMobile } = useSidebar();

  const { conversations, isLoading: convsLoading } = useConversations();

  // Extract activeConversationId from route: /chat/[conversationId]
  const pathParts = pathname.split("/");
  const activeConversationId =
    pathParts[1] === "chat" && pathParts[2] ? pathParts[2] : null;

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router]
  );

  const handleNewChat = useCallback(() => {
    router.push("/chat");
    closeMobile();
  }, [router, closeMobile]);

  return (
    <div className="app-shell">
      <Navbar onNewChat={handleNewChat} />

      <div className="main-layout">
        {/* Mobile backdrop — click to close sidebar */}
        <div
          className={`sidebar-backdrop${mobileOpen ? " sidebar-backdrop-visible" : ""}`}
          onClick={closeMobile}
          aria-hidden="true"
        />

        <Sidebar
          conversations={conversations}
          isLoading={convsLoading}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />
        {children}
      </div>
    </div>
  );
}
