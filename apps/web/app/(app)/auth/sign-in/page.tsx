"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthError } from "@/lib/api/auth";

function getSignInErrorMessage(err: unknown): string {
  if (!(err instanceof AuthError)) {
    return "Sign-in failed. Please try again.";
  }

  switch (err.code) {
    case "invalid_credentials":
      return "Email or password is incorrect. Please try again.";
    case "rate_limit_exceeded":
      return "Too many sign-in attempts. Please wait a moment and try again.";
    case "email_not_verified":
      return "Please verify your email first.";
    default:
      if (err.status === 401) {
        return "Email or password is incorrect. Please try again.";
      }
      if (err.status === 429) {
        return "Too many sign-in attempts. Please wait a moment and try again.";
      }
      return "Sign-in failed. Please try again.";
  }
}

export default function SignInPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/profile");
    } catch (err) {
      if (err instanceof AuthError && err.code === "email_not_verified") {
        router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      setError(getSignInErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Sign in</h1>
      <p className="mt-1 text-center text-sm text-gray-600">
        Sign in to your account to use TRYL.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-3 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="font-medium text-black hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
