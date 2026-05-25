export type ConversationType = "chat" | "document";

export interface Conversation {
  _id: string;
  title?: string;
  type: ConversationType;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  role: "user" | "model";
  content: string;
  sources?: SearchResult[];
  followUps?: string[];
  createdAt: string;
}

export interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
}

export interface UserDocument {
  _id: string;
  fileName: string;
  fileSize: number;
  totalChunks?: number;
  status: "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

// Active chat mode — either a plain chat or a document-scoped RAG chat
export type ChatMode =
  | { type: "chat" }
  | { type: "document"; documentId: string; documentName: string };

export interface StreamingMessage {
  id: string;
  role: "user" | "model";
  content: string;
  sources?: SearchResult[];
  followUps?: string[];
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatState {
  conversationId: string | null;
  messages: StreamingMessage[];
  isLoading: boolean;
  credits: number | null;
  lowBalance: boolean;
}
