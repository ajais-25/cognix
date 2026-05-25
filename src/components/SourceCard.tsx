"use client";

import { SearchResult } from "@/lib/types";

interface SourceCardProps {
  source: SearchResult;
}

function getFavicon(url?: string) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  } catch {
    return null;
  }
}

export default function SourceCard({ source }: SourceCardProps) {
  const favicon = getFavicon(source.url);
  const domain = source.url
    ? (() => {
        try {
          return new URL(source.url).hostname.replace("www.", "");
        } catch {
          return source.url;
        }
      })()
    : null;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-card"
      title={source.title}
    >
      {favicon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" width={14} height={14} className="source-favicon" />
      )}
      <span className="source-domain">{domain}</span>
    </a>
  );
}
