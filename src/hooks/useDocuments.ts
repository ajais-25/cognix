"use client";

import { useChatData } from "@/context/ChatDataContext";

export function useDocuments() {
  const {
    documents,
    isLoadingDocuments,
    isUploadingDocument,
    uploadError,
    uploadSuccess,
    fetchDocuments,
    uploadDocument,
    clearUploadState,
  } = useChatData();

  return {
    documents,
    isLoading: isLoadingDocuments,
    isUploading: isUploadingDocument,
    uploadError,
    uploadSuccess,
    fetchDocuments,
    uploadDocument,
    clearUploadState,
  };
}

