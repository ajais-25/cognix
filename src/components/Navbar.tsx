"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useSidebar } from "@/context/SidebarContext";

interface NavbarProps {
  onNewChat?: () => void;
}

export default function Navbar({ onNewChat }: NavbarProps) {
  const { isLoggedIn, user, credits, lowBalance, logout, isLoading } =
    useAuth();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.refresh();
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? "?";

  const handleLogoClick = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push("/chat");
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className="mobile-menu-btn"
          onClick={toggleMobile}
          aria-label="Toggle sidebar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button className="nav-logo" onClick={handleLogoClick}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>Cognix</span>
        </button>
      </div>

      <div className="navbar-right">
        {isLoading ? (
          <div className="nav-skeleton" />
        ) : isLoggedIn ? (
          <>
            {lowBalance && (
              <span className="credit-warning" title="Low balance">
                ⚠ Low credits
              </span>
            )}

            <span className="credit-badge">
              {credits !== null ? `${credits} cr` : "—"}
            </span>

            {/* Divider */}
            <div className="nav-divider" />

            {/* Avatar + dropdown */}
            <div className="nav-avatar-wrap" ref={dropdownRef}>
              <button
                id="nav-avatar-btn"
                className="nav-avatar"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={dropdownOpen}
              >
                {initial}
              </button>

              {dropdownOpen && (
                <div className="nav-dropdown" role="menu">
                  <div className="nav-dropdown-header">
                    <p className="nav-dropdown-name">{user?.name}</p>
                    <p className="nav-dropdown-email">{user?.email}</p>
                  </div>
                  <div className="nav-dropdown-divider" />

                  {/* Theme toggle */}
                  <button
                    id="nav-theme-btn"
                    className="nav-dropdown-item"
                    onClick={toggleTheme}
                    role="menuitem"
                  >
                    {theme === "dark" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>

                  <div className="nav-dropdown-divider" />
                  <button
                    id="nav-signout-btn"
                    className="nav-dropdown-signout"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/sign-in" className="nav-signin-btn">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
