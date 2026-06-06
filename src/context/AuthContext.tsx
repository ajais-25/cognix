"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  ReactNode,
} from "react";
import axios from "axios";
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

  // Synchronously hydrate user from localStorage before browser paint.
  // This runs after hydration (so no mismatch) but before the browser
  // paints (so no visual flash of unauthenticated UI).
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("cognix_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await axios.get("/api/credits");
      setCreditsState(res.data.data.credits);
      setLowBalance(res.data.data.lowBalance);
      // If the credits endpoint succeeded, the user is authenticated.
      // Re-read localStorage in case it was updated.
      const stored = localStorage.getItem("cognix_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Session expired or invalid — clear optimistic state
        localStorage.removeItem("cognix_user");
        setUser(null);
        setCreditsState(null);
        return;
      }
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
    await axios.post("/api/users/logout");
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
