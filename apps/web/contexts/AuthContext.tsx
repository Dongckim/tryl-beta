"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthUser } from "@/lib/auth";
import { getSession, setSession, clearSession } from "@/lib/auth";
import { signIn as apiSignIn, signUp as apiSignUp } from "@/lib/api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiSignIn({ email, password });
    setSession({ accessToken: res.access_token, user: res.user });
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await apiSignUp({ email, password });
    setSession({ accessToken: res.access_token, user: res.user });
    setUser(res.user);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
