"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  credits: number | null;
  lowBalance: boolean;
  setCredits: (credits: number, lowBalance: boolean) => void;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCreditsState] = useState<number | null>(null);
  const [lowBalance, setLowBalance] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.status === 401) {
        setUser(null);
        setCreditsState(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCreditsState(data.data.credits);
        setLowBalance(data.data.lowBalance);
        // We don't get user info from credits endpoint — try a cheap ping
        // If the credits endpoint succeeded, the user is authenticated.
        // We'll store minimal info from sign-in flow.
        const stored = localStorage.getItem("cognix_user");
        if (stored) {
          setUser(JSON.parse(stored));
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const setCredits = useCallback((c: number, lb: boolean) => {
    setCreditsState(c);
    setLowBalance(lb);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/users/logout", { method: "POST" });
    localStorage.removeItem("cognix_user");
    setUser(null);
    setCreditsState(null);
    setLowBalance(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        isLoading,
        credits,
        lowBalance,
        setCredits,
        logout,
        refetchUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// Called after successful sign-in to persist user info
export function persistUser(user: AuthUser) {
  localStorage.setItem("cognix_user", JSON.stringify(user));
}
