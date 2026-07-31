import Link from "next/link";
import React from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
}

export default function Logo({
  size = 24,
  showText = true,
  href,
  className = "",
  onClick,
}: LogoProps) {
  const content = (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      {showText && <span>Cognix</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
