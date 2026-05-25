"use client";

import { useState, useEffect, useCallback } from "react";
import { UserDocument } from "@/lib/types";

export function useDocuments() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = useCallback(
    async (
      file: File,
      onSuccess?: (doc: {
        documentId: string;
        fileName: string;
        creditsRemaining: number;
        lowBalance: boolean;
      }) => void,
    ) => {
      setUploadError(null);
      setUploadSuccess(false);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setUploadError(data.message ?? "Upload failed");
          return;
        }

        setUploadSuccess(true);
        await fetchDocuments();
        onSuccess?.(data.data);
      } catch {
        setUploadError("Network error while uploading.");
      } finally {
        setIsUploading(false);
      }
    },
    [fetchDocuments],
  );

  return {
    documents,
    isLoading,
    isUploading,
    uploadError,
    uploadSuccess,
    fetchDocuments,
    uploadDocument,
    clearUploadState: () => {
      setUploadError(null);
      setUploadSuccess(false);
    },
  };
}
