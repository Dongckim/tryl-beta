"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

function VerifyEmailContent() {
  const { verifyEmailCode, resendVerification } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmailCode(email.trim().toLowerCase(), code.trim());
      router.push("/profile");
    } catch (err: unknown) {
      const codeErr = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
      setError(
        codeErr === "verification_code_expired" ? "This code has expired. Please request a new one." :
        codeErr === "verification_code_max_attempts_exceeded" ? "Too many attempts. Request a new code." :
        "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await resendVerification(email.trim().toLowerCase());
      setResendCooldown(60);
      const t = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(t);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const codeErr = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
      setError(codeErr === "verification_resend_too_soon" ? "You can request a new code in 60 seconds." : "Failed to resend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Verify your email</h1>
      <p className="mt-1 text-center text-sm text-gray-600">
        Your email is not verified yet. Please verify your email first.
      </p>
      <form onSubmit={handleVerify} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">6-digit code</label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            maxLength={6}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="000000"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="text-sm text-gray-600 hover:text-black disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification code"}
          </button>
        </div>
      </form>
      <p className="mt-3 text-center text-sm text-gray-600">
        <Link href="/auth/sign-in" className="font-medium text-black hover:underline">Sign in</Link>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
