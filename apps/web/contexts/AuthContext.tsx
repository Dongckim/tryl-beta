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
import {
  getMe,
  signIn as apiSignIn,
  signUp as apiSignUp,
  verifyEmailCode as apiVerifyEmailCode,
  resendVerification as apiResendVerification,
  type SignUpRequest,
} from "@/lib/api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  pendingWelcome: boolean;
  dismissWelcome: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpRequest) => Promise<{ email: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingWelcome, setPendingWelcome] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(session.user);
    setLoading(false);
    getMe()
      .then((fresh) => {
        setUser(fresh);
        setSession({ accessToken: session.accessToken, user: fresh });
      })
      .catch(() => { /* keep stored user on 401 etc */ });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiSignIn({ email, password });
    setSession({ accessToken: res.access_token, user: res.user });
    setUser(res.user);
    setPendingWelcome(true);
  }, []);

  const signUp = useCallback(async (data: SignUpRequest) => {
    const res = await apiSignUp(data);
    return { email: res.email };
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    const res = await apiVerifyEmailCode({ email, code });
    setSession({ accessToken: res.access_token, user: res.user });
    setUser(res.user);
    setPendingWelcome(true);
  }, []);

  const dismissWelcome = useCallback(() => setPendingWelcome(false), []);

  const resendVerification = useCallback(async (email: string) => {
    await apiResendVerification({ email });
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pendingWelcome,
        dismissWelcome,
        signIn,
        signUp,
        verifyEmailCode,
        resendVerification,
        signOut,
      }}
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
